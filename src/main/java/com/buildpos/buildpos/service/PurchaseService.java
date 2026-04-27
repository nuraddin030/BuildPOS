package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.PurchasePaymentRequest;
import com.buildpos.buildpos.dto.request.PurchaseRequest;
import com.buildpos.buildpos.dto.request.ReceivePurchaseRequest;
import com.buildpos.buildpos.dto.response.LastPurchaseInfoResponse;
import com.buildpos.buildpos.dto.response.PurchaseResponse;
import com.buildpos.buildpos.dto.response.PurchaseSummaryResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.entity.enums.PaymentMethod;
import com.buildpos.buildpos.entity.enums.PurchaseStatus;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.security.AuditDetailsHolder;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final PurchaseItemRepository purchaseItemRepository;
    private final PurchasePaymentRepository purchasePaymentRepository;
    private final ProductUnitRepository productUnitRepository;
    private final SupplierRepository supplierRepository;
    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SupplierDebtRepository supplierDebtRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseCategoryRepository expenseCategoryRepository;
    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @Transactional
    public PurchaseResponse create(PurchaseRequest request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new NotFoundException("Supplier topilmadi: " + request.getSupplierId()));

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new NotFoundException("Ombor topilmadi: " + request.getWarehouseId()));

        Purchase purchase = Purchase.builder()
                .referenceNo(generateReferenceNo())
                .supplier(supplier)
                .warehouse(warehouse)
                .status(PurchaseStatus.PENDING)
                .notes(request.getNotes())
                .expectedAt(request.getExpectedAt())
                .totalAmount(BigDecimal.ZERO)
                .paidAmount(BigDecimal.ZERO)
                .debtAmount(BigDecimal.ZERO)
                .totalUsd(BigDecimal.ZERO)
                .totalUzs(BigDecimal.ZERO)
                .paidUsd(BigDecimal.ZERO)
                .paidUzs(BigDecimal.ZERO)
                .debtUsd(BigDecimal.ZERO)
                .debtUzs(BigDecimal.ZERO)
                .build();

        purchase = purchaseRepository.save(purchase);

        for (PurchaseRequest.PurchaseItemRequest itemReq : request.getItems()) {
            buildAndSaveItem(purchase, itemReq);
        }

        recalculateTotals(purchase);
        purchaseRepository.save(purchase);
        AuditDetailsHolder.setEntityName(purchase.getReferenceNo() + " — " + supplier.getName());

        return toResponse(purchase);
    }

    // ─────────────────────────────────────────
    // UPDATE (faqat PENDING) — supplier/warehouse o'zgarmaydi, faqat itemlar + izoh
    // ─────────────────────────────────────────
    @Transactional
    public PurchaseResponse update(Long id, PurchaseRequest request) {
        Purchase purchase = findById(id);
        if (purchase.getStatus() != PurchaseStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING statusdagi xaridni tahrirlash mumkin");
        }

        // Eski itemlarni o'chirib yangidan yozamiz (PENDING da receivedQty har doim 0)
        purchase.getItems().clear();
        purchaseItemRepository.deleteAll(purchaseItemRepository.findAllByPurchaseId(id));

        if (request.getNotes() != null) purchase.setNotes(request.getNotes());
        if (request.getExpectedAt() != null) purchase.setExpectedAt(request.getExpectedAt());

        purchaseRepository.save(purchase);

        for (PurchaseRequest.PurchaseItemRequest itemReq : request.getItems()) {
            buildAndSaveItem(purchase, itemReq);
        }

        recalculateTotals(purchase);
        purchaseRepository.save(purchase);
        updateSupplierDebt(purchase);
        AuditDetailsHolder.setEntityName(purchase.getReferenceNo() + " — " + purchase.getSupplier().getName());
        return toResponse(purchase);
    }

    // ─────────────────────────────────────────
    // ADD ITEM (faqat PENDING)
    // ─────────────────────────────────────────
    @Transactional
    public PurchaseResponse addItem(Long purchaseId, PurchaseRequest.PurchaseItemRequest itemReq) {
        Purchase purchase = findById(purchaseId);
        if (purchase.getStatus() != PurchaseStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING statusdagi xaridga mahsulot qo'shish mumkin");
        }
        buildAndSaveItem(purchase, itemReq);
        recalculateTotals(purchase);
        purchaseRepository.save(purchase);
        updateSupplierDebt(purchase);
        return toResponse(purchase);
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public PurchaseResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // GET ALL (filter + pagination)
    // ─────────────────────────────────────────
    public Page<PurchaseSummaryResponse> getAll(
            Long supplierId, Long warehouseId,
            String status,
            LocalDateTime from, LocalDateTime to,
            Pageable pageable) {

        return purchaseRepository
                .findAllFiltered(supplierId, warehouseId, status, from, to, pageable)
                .map(this::toSummaryResponse);
    }

    // ─────────────────────────────────────────
    // RECEIVE (tovarni qabul qilish)
    // ─────────────────────────────────────────
    @Transactional
    public PurchaseResponse receive(Long id, ReceivePurchaseRequest request) {
        Purchase purchase = findById(id);

        if (purchase.getStatus() == PurchaseStatus.CANCELLED) {
            throw new BadRequestException("Bekor qilingan xaridni qabul qilib bo'lmaydi");
        }
        if (purchase.getStatus() == PurchaseStatus.RECEIVED) {
            throw new BadRequestException("Bu xarid allaqachon to'liq qabul qilingan");
        }

        List<PurchaseItem> items = purchaseItemRepository.findAllByPurchaseId(id);

        if (request.getItems() == null || request.getItems().isEmpty()) {
            // Hammasi to'liq qabul
            for (PurchaseItem item : items) {
                BigDecimal remaining = item.getQuantity().subtract(item.getReceivedQty());
                if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                    receiveItem(item, remaining, purchase.getWarehouse(), null, null, null, false);
                }
            }
            purchase.setStatus(PurchaseStatus.RECEIVED);
            purchase.setReceivedAt(LocalDateTime.now());
        } else {
            // Qisman qabul
            for (ReceivePurchaseRequest.ReceiveItemRequest receiveReq : request.getItems()) {
                PurchaseItem item = items.stream()
                        .filter(i -> i.getId().equals(receiveReq.getPurchaseItemId()))
                        .findFirst()
                        .orElseThrow(() -> new NotFoundException("Purchase item topilmadi: " + receiveReq.getPurchaseItemId()));

                BigDecimal remaining = item.getQuantity().subtract(item.getReceivedQty());
                if (receiveReq.getReceivedQty().compareTo(remaining) > 0) {
                    throw new BadRequestException(
                            "Qabul miqdori buyurtma miqdoridan oshib ketdi. Maksimal: " + remaining
                    );
                }

                receiveItem(item, receiveReq.getReceivedQty(), purchase.getWarehouse(),
                        receiveReq.getUnitPrice(),
                        receiveReq.getSalePrice(),
                        receiveReq.getMinPrice(),
                        Boolean.TRUE.equals(receiveReq.getUpdatePrices()));
            }

            // Status yangilash
            boolean allReceived = items.stream()
                    .allMatch(i -> i.getReceivedQty().compareTo(i.getQuantity()) >= 0);
            purchase.setStatus(allReceived ? PurchaseStatus.RECEIVED : PurchaseStatus.PARTIALLY_RECEIVED);

            if (allReceived) {
                purchase.setReceivedAt(LocalDateTime.now());
            }
        }

        updateSupplierDebt(purchase);
        return toResponse(purchaseRepository.save(purchase));
    }

    // ─────────────────────────────────────────
    // ADD PAYMENT (to'lov qo'shish) — multi-currency
    // ─────────────────────────────────────────
    @Transactional
    public PurchaseResponse addPayment(Long id, PurchasePaymentRequest request) {
        Purchase purchase = findById(id);

        if (purchase.getStatus() == PurchaseStatus.CANCELLED) {
            throw new BadRequestException("Bekor qilingan xaridga to'lov qo'shib bo'lmaydi");
        }

        String currency = request.getCurrency() != null ? request.getCurrency() : "UZS";

        // Valyutaga qarab qarz tekshirish
        if ("USD".equals(currency)) {
            if (request.getAmount().compareTo(purchase.getDebtUsd()) > 0) {
                throw new BadRequestException(
                        "To'lov summasi USD qarzdan oshib ketdi. Maksimal: " + purchase.getDebtUsd() + " USD"
                );
            }
        } else {
            if (request.getAmount().compareTo(purchase.getDebtUzs()) > 0) {
                throw new BadRequestException(
                        "To'lov summasi UZS qarzdan oshib ketdi. Maksimal: " + purchase.getDebtUzs() + " UZS"
                );
            }
        }

        PurchasePayment payment = PurchasePayment.builder()
                .purchase(purchase)
                .supplier(purchase.getSupplier())
                .amount(request.getAmount())
                .currency(currency)
                .paymentMethod(request.getPaymentMethod())
                .note(request.getNote())
                .paidAt(request.getPaidAt() != null ? request.getPaidAt() : LocalDateTime.now())
                .build();

        purchasePaymentRepository.save(payment);

        // Valyutaga qarab paidUsd/paidUzs yangilash
        if ("USD".equals(currency)) {
            purchase.setPaidUsd(purchase.getPaidUsd().add(request.getAmount()));
            purchase.setDebtUsd(purchase.getTotalUsd().subtract(purchase.getPaidUsd()));
        } else {
            purchase.setPaidUzs(purchase.getPaidUzs().add(request.getAmount()));
            purchase.setDebtUzs(purchase.getTotalUzs().subtract(purchase.getPaidUzs()));
        }

        // Legacy fields sync (UZS qism uchun)
        purchase.setPaidAmount(purchase.getPaidUzs());
        purchase.setDebtAmount(purchase.getDebtUzs());

        purchaseRepository.save(purchase);
        updateSupplierDebt(purchase);

        // ── Smena harajati (agar belgilangan bo'lsa) ─────────────
        BigDecimal expenseAmt = request.getShiftExpenseAmount();
        if (expenseAmt != null && expenseAmt.compareTo(BigDecimal.ZERO) > 0) {
            try {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username).orElse(null);
                Shift shift = null;
                if (user != null) {
                    shift = shiftRepository.findByCashierIdAndStatus(user.getId(), ShiftStatus.OPEN)
                            .or(() -> shiftRepository.findFirstByStatus(ShiftStatus.OPEN))
                            .orElse(null);
                }
                if (shift != null) {
                    ExpenseCategory category = expenseCategoryRepository.findByName("Yetkazuvchiga to'lov")
                            .orElseGet(() -> expenseCategoryRepository.save(
                                    ExpenseCategory.builder().name("Yetkazuvchiga to'lov").build()));
                    PaymentMethod method = request.getPaymentMethod() != null
                            ? request.getPaymentMethod()
                            : PaymentMethod.CASH;
                    expenseRepository.save(Expense.builder()
                            .date(LocalDate.now())
                            .category(category)
                            .amount(expenseAmt)
                            .paymentMethod(method)
                            .supplierId(purchase.getSupplier() != null ? purchase.getSupplier().getId() : null)
                            .note("Yetkazuvchi: " + (purchase.getSupplier() != null ? purchase.getSupplier().getName() : "")
                                    + " | Xarid: " + purchase.getReferenceNo())
                            .shift(shift)
                            .createdBy(user)
                            .build());
                }
            } catch (Exception ignored) {
                // smena topilmasa harajat yozilmaydi, asosiy to'lov davom etadi
            }
        }

        return toResponse(purchase);
    }

    // ─────────────────────────────────────────
    // CANCEL
    // ─────────────────────────────────────────
    @Transactional
    public PurchaseResponse cancel(Long id) {
        Purchase purchase = findById(id);

        if (purchase.getStatus() != PurchaseStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING statusdagi xaridni bekor qilish mumkin");
        }

        purchase.setStatus(PurchaseStatus.CANCELLED);
        return toResponse(purchaseRepository.save(purchase));
    }

    // ─────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────

    /**
     * PurchaseItemRequest dan PurchaseItem yaratib saqlaydi.
     * create() va addItem() ikkisi ham shu methoddan foydalanadi.
     */
    private void buildAndSaveItem(Purchase purchase, PurchaseRequest.PurchaseItemRequest itemReq) {
        ProductUnit productUnit = productUnitRepository.findById(itemReq.getProductUnitId())
                .orElseThrow(() -> new NotFoundException("Product unit topilmadi: " + itemReq.getProductUnitId()));

        if ("USD".equals(itemReq.getCurrency()) && itemReq.getExchangeRate() == null) {
            throw new BadRequestException("USD uchun kurs kiritilishi kerak");
        }

        BigDecimal exchangeRate = itemReq.getExchangeRate() != null
                ? itemReq.getExchangeRate()
                : BigDecimal.ONE;

        String currency = itemReq.getCurrency() != null ? itemReq.getCurrency() : "UZS";

        BigDecimal unitPriceUzs = "USD".equals(currency)
                ? itemReq.getUnitPrice().multiply(exchangeRate)
                : itemReq.getUnitPrice();

        BigDecimal itemTotal = unitPriceUzs.multiply(itemReq.getQuantity());

        PurchaseItem item = PurchaseItem.builder()
                .purchase(purchase)
                .productUnit(productUnit)
                .quantity(itemReq.getQuantity())
                .unitPrice(itemReq.getUnitPrice())
                .totalPrice(itemTotal)
                .currency(currency)
                .exchangeRate(exchangeRate)
                .unitPriceUzs(unitPriceUzs)
                .receivedQty(BigDecimal.ZERO)
                .build();

        purchaseItemRepository.save(item);

        // updatePrices=true bo'lsa narxlarni darhol yangilash
        if (Boolean.TRUE.equals(itemReq.getUpdatePrices())) {
            updateProductUnitPrices(productUnit, unitPriceUzs,
                    itemReq.getSalePrice(), itemReq.getMinPrice());
        }
    }

    /**
     * Barcha itemlardan totalUsd / totalUzs ni qayta hisoblaydi.
     * USD itemlar — USD da saqlanadi (kurs ishlatilmaydi).
     * UZS itemlar — UZS da saqlanadi.
     */
    private void recalculateTotals(Purchase purchase) {
        List<PurchaseItem> items = purchaseItemRepository.findAllByPurchaseId(purchase.getId());

        BigDecimal totalUsd = BigDecimal.ZERO;
        BigDecimal totalUzs = BigDecimal.ZERO;

        for (PurchaseItem item : items) {
            if ("USD".equals(item.getCurrency())) {
                // unitPrice bu yerda USD da
                totalUsd = totalUsd.add(item.getUnitPrice().multiply(item.getQuantity()));
            } else {
                totalUzs = totalUzs.add(item.getTotalPrice());
            }
        }

        purchase.setTotalUsd(totalUsd);
        purchase.setTotalUzs(totalUzs);
        purchase.setDebtUsd(totalUsd.subtract(purchase.getPaidUsd()));
        purchase.setDebtUzs(totalUzs.subtract(purchase.getPaidUzs()));

        // Legacy: UZS qism uchun
        purchase.setTotalAmount(totalUzs);
        purchase.setDebtAmount(totalUzs.subtract(purchase.getPaidUzs()));
    }

    private void receiveItem(PurchaseItem item, BigDecimal qty, Warehouse warehouse,
                             BigDecimal newUnitPrice, BigDecimal newSalePrice,
                             BigDecimal newMinPrice, boolean updatePrices) {
        // Narx o'zgargan bo'lsa yangilash
        if (newUnitPrice != null) {
            item.setUnitPrice(newUnitPrice);
            BigDecimal newUzs = "USD".equals(item.getCurrency())
                    ? newUnitPrice.multiply(item.getExchangeRate())
                    : newUnitPrice;
            item.setUnitPriceUzs(newUzs);
            item.setTotalPrice(newUzs.multiply(item.getQuantity()));
        }

        // UZS narxini olish
        BigDecimal unitPriceUzs = item.getUnitPriceUzs() != null
                ? item.getUnitPriceUzs()
                : item.getUnitPrice();

        // Non-base unit bo'lsa → base unit topib, effectiveQty ni qo'shamiz
        ProductUnit purchasedUnit = item.getProductUnit();
        ProductUnit stockUnit = purchasedUnit;
        BigDecimal effectiveQty = qty;

        if (!Boolean.TRUE.equals(purchasedUnit.getIsBaseUnit())) {
            stockUnit = productUnitRepository
                    .findByProductIdAndIsBaseUnitTrue(purchasedUnit.getProduct().getId())
                    .orElse(purchasedUnit);
            BigDecimal cf = purchasedUnit.getConversionFactor();
            if (cf != null && cf.compareTo(BigDecimal.ONE) != 0) {
                effectiveQty = qty.multiply(cf).setScale(4, java.math.RoundingMode.HALF_UP);
            }
        }

        // Stock ko'tarish (base unit stockiga)
        final ProductUnit finalStockUnit = stockUnit;
        WarehouseStock stock = warehouseStockRepository
                .findByWarehouseIdAndProductUnitId(warehouse.getId(), finalStockUnit.getId())
                .orElseGet(() -> WarehouseStock.builder()
                        .warehouse(warehouse)
                        .productUnit(finalStockUnit)
                        .quantity(BigDecimal.ZERO)
                        .minStock(BigDecimal.ZERO)
                        .build());

        stock.setQuantity(stock.getQuantity().add(effectiveQty));
        warehouseStockRepository.save(stock);

        // Stock movement yozish (UZS da)
        StockMovement movement = StockMovement.builder()
                .productUnit(stockUnit)
                .movementType(StockMovementType.PURCHASE_IN)
                .toWarehouse(warehouse)
                .quantity(effectiveQty)
                .unitPrice(unitPriceUzs)
                .totalPrice(unitPriceUzs.multiply(qty))
                .referenceType("PURCHASE")
                .referenceId(item.getPurchase().getId())
                .build();
        stockMovementRepository.save(movement);

        // Item received qty yangilash
        item.setReceivedQty(item.getReceivedQty().add(qty));
        purchaseItemRepository.save(item);

        // Narxlarni yangilash — updatePrices flag 3 ta narxni ham nazorat qiladi
        updateProductUnitPrices(item.getProductUnit(),
                updatePrices ? unitPriceUzs : null,
                updatePrices ? newSalePrice : null,
                updatePrices ? newMinPrice : null);
    }

    private void updateProductUnitPrices(ProductUnit productUnit, BigDecimal costPrice,
                                         BigDecimal salePrice, BigDecimal minPrice) {
        if (costPrice != null) {
            productUnit.setCostPrice(costPrice);
        }
        if (salePrice != null && salePrice.compareTo(BigDecimal.ZERO) > 0) {
            productUnit.setSalePrice(salePrice);
        }
        if (minPrice != null && minPrice.compareTo(BigDecimal.ZERO) > 0) {
            productUnit.setMinPrice(minPrice);
        }
        productUnitRepository.save(productUnit);
    }

    private void updateSupplierDebt(Purchase purchase) {
        boolean hasUsdDebt = purchase.getDebtUsd().compareTo(BigDecimal.ZERO) > 0;
        boolean hasUzsDebt = purchase.getDebtUzs().compareTo(BigDecimal.ZERO) > 0;

        // USD qarz yozuvi
        updateOrCreateDebtByCurrency(purchase, "USD",
                purchase.getTotalUsd(), purchase.getPaidUsd(), purchase.getDebtUsd(), hasUsdDebt);

        // UZS qarz yozuvi
        updateOrCreateDebtByCurrency(purchase, "UZS",
                purchase.getTotalUzs(), purchase.getPaidUzs(), purchase.getDebtUzs(), hasUzsDebt);
    }

    private void updateOrCreateDebtByCurrency(Purchase purchase, String currency,
                                               BigDecimal total, BigDecimal paid,
                                               BigDecimal debt, boolean hasDebt) {
        supplierDebtRepository.findByPurchaseIdAndCurrency(purchase.getId(), currency)
                .ifPresentOrElse(
                        existing -> {
                            existing.setAmount(total);
                            existing.setPaidAmount(paid);
                            existing.setIsPaid(!hasDebt);
                            supplierDebtRepository.save(existing);
                        },
                        () -> {
                            if (hasDebt) {
                                SupplierDebt newDebt = SupplierDebt.builder()
                                        .supplier(purchase.getSupplier())
                                        .purchase(purchase)
                                        .amount(total)
                                        .paidAmount(paid)
                                        .currency(currency)
                                        .isPaid(false)
                                        .notes("Purchase: " + purchase.getReferenceNo())
                                        .build();
                                supplierDebtRepository.save(newDebt);
                            }
                        }
                );
    }

    private String generateReferenceNo() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = purchaseRepository.count() + 1;
        return String.format("PUR-%s-%04d", date, count);
    }

    private Purchase findById(Long id) {
        return purchaseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Xarid topilmadi: " + id));
    }

    private PurchaseResponse toResponse(Purchase purchase) {
        List<PurchaseItem> items = purchaseItemRepository.findAllByPurchaseId(purchase.getId());
        List<PurchasePayment> payments = purchasePaymentRepository.findAllByPurchaseId(purchase.getId());
        List<SupplierDebt> debts = supplierDebtRepository.findAllByPurchaseId(purchase.getId());

        return PurchaseResponse.builder()
                .id(purchase.getId())
                .referenceNo(purchase.getReferenceNo())
                .supplierId(purchase.getSupplier().getId())
                .supplierName(purchase.getSupplier().getName())
                .warehouseId(purchase.getWarehouse().getId())
                .warehouseName(purchase.getWarehouse().getName())
                .status(purchase.getStatus())
                .totalAmount(purchase.getTotalAmount())
                .paidAmount(purchase.getPaidAmount())
                .debtAmount(purchase.getDebtAmount())
                .totalUsd(purchase.getTotalUsd())
                .totalUzs(purchase.getTotalUzs())
                .paidUsd(purchase.getPaidUsd())
                .paidUzs(purchase.getPaidUzs())
                .debtUsd(purchase.getDebtUsd())
                .debtUzs(purchase.getDebtUzs())
                .notes(purchase.getNotes())
                .expectedAt(purchase.getExpectedAt())
                .receivedAt(purchase.getReceivedAt())
                .items(items.stream().map(item -> PurchaseResponse.PurchaseItemResponse.builder()
                        .id(item.getId())
                        .productUnitId(item.getProductUnit().getId())
                        .productName(item.getProductUnit().getProduct().getName())
                        .unitSymbol(item.getProductUnit().getUnit().getSymbol())
                        .barcode(item.getProductUnit().getBarcode())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .currency(item.getCurrency())
                        .exchangeRate(item.getExchangeRate())
                        .unitPriceUzs(item.getUnitPriceUzs())
                        .receivedQty(item.getReceivedQty())
                        .remainingQty(item.getQuantity().subtract(item.getReceivedQty()))
                        .salePrice(item.getProductUnit().getSalePrice())
                        .minPrice(item.getProductUnit().getMinPrice())
                        .build()).toList())
                .payments(payments.stream().map(p -> PurchaseResponse.PurchasePaymentResponse.builder()
                        .id(p.getId())
                        .amount(p.getAmount())
                        .currency(p.getCurrency())
                        .paymentMethod(p.getPaymentMethod() != null ? p.getPaymentMethod().name() : null)
                        .note(p.getNote())
                        .paidAt(p.getPaidAt())
                        .paidBy(p.getPaidBy() != null ? p.getPaidBy().getUsername() : null)
                        .build()).toList())
                .createdAt(purchase.getCreatedAt())
                .createdBy(purchase.getCreatedBy() != null ? purchase.getCreatedBy().getUsername() : null)
                .debts(debts.stream().map(d -> PurchaseResponse.SupplierDebtInfo.builder()
                        .id(d.getId())
                        .amount(d.getAmount())
                        .paidAmount(d.getPaidAmount())
                        .remainingAmount(d.getAmount().subtract(
                                d.getPaidAmount() != null ? d.getPaidAmount() : BigDecimal.ZERO))
                        .currency(d.getCurrency())
                        .dueDate(d.getDueDate())
                        .isPaid(d.getIsPaid())
                        .build()).toList())
                .build();
    }

    private PurchaseSummaryResponse toSummaryResponse(Purchase purchase) {
        return PurchaseSummaryResponse.builder()
                .id(purchase.getId())
                .referenceNo(purchase.getReferenceNo())
                .supplierName(purchase.getSupplier().getName())
                .warehouseName(purchase.getWarehouse().getName())
                .status(purchase.getStatus())
                .totalAmount(purchase.getTotalAmount())
                .paidAmount(purchase.getPaidAmount())
                .debtAmount(purchase.getDebtAmount())
                .totalUsd(purchase.getTotalUsd())
                .totalUzs(purchase.getTotalUzs())
                .debtUsd(purchase.getDebtUsd())
                .debtUzs(purchase.getDebtUzs())
                .itemCount(purchase.getItems().size())
                .expectedAt(purchase.getExpectedAt())
                .receivedAt(purchase.getReceivedAt())
                .createdAt(purchase.getCreatedAt())
                .createdBy(purchase.getCreatedBy() != null ? purchase.getCreatedBy().getUsername() : null)
                .build();
    }

    // ─────────────────────────────────────────
    // OXIRGI XARID MA'LUMOTI (autofill uchun)
    // ─────────────────────────────────────────
    public LastPurchaseInfoResponse getLastPurchaseInfo(Long productUnitId, Long supplierId) {
        Pageable top1 = PageRequest.of(0, 1);

        List<PurchaseItem> result = List.of();
        boolean sameSupplier = false;

        if (supplierId != null) {
            result = purchaseItemRepository.findLastBySupplierAndProductUnit(productUnitId, supplierId, top1);
            sameSupplier = !result.isEmpty();
        }

        if (result.isEmpty()) {
            result = purchaseItemRepository.findLastByProductUnit(productUnitId, top1);
        }

        if (!result.isEmpty()) {
            PurchaseItem item = result.get(0);
            Supplier itemSupplier = item.getPurchase().getSupplier();
            return LastPurchaseInfoResponse.builder()
                    .unitPrice(item.getUnitPrice())
                    .currency(item.getCurrency())
                    .exchangeRate(item.getExchangeRate())
                    .supplierId(itemSupplier.getId())
                    .supplierName(itemSupplier.getName())
                    .purchaseDate(item.getCreatedAt())
                    .sameSupplier(sameSupplier)
                    .build();
        }

        // Xarid tarixi yo'q — karta tannarxidan foydalanamiz (qo'lda kiritilgan mahsulotlar uchun)
        ProductUnit unit = productUnitRepository.findById(productUnitId).orElse(null);
        if (unit == null) return null;

        BigDecimal unitPrice;
        String currency;
        BigDecimal exchangeRate;

        // USD da saqlangan bo'lsa — USD qaytaramiz
        if (unit.getCostPriceUsd() != null
                && unit.getCostPriceUsd().compareTo(BigDecimal.ZERO) > 0) {
            unitPrice = unit.getCostPriceUsd();
            currency = "USD";
            exchangeRate = unit.getExchangeRateAtSave() != null
                    ? unit.getExchangeRateAtSave()
                    : BigDecimal.valueOf(12700);
        } else if (unit.getCostPrice() != null
                && unit.getCostPrice().compareTo(BigDecimal.ZERO) > 0) {
            unitPrice = unit.getCostPrice();
            currency = "UZS";
            exchangeRate = BigDecimal.ONE;
        } else {
            return null;
        }

        return LastPurchaseInfoResponse.builder()
                .unitPrice(unitPrice)
                .currency(currency)
                .exchangeRate(exchangeRate)
                .supplierId(null)
                .supplierName(null)
                .purchaseDate(null)
                .sameSupplier(false)
                .build();
    }
}