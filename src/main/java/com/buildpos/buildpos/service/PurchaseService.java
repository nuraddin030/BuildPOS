package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.PurchasePaymentRequest;
import com.buildpos.buildpos.dto.request.PurchaseRequest;
import com.buildpos.buildpos.dto.request.ReceivePurchaseRequest;
import com.buildpos.buildpos.dto.response.PurchaseResponse;
import com.buildpos.buildpos.dto.response.PurchaseSummaryResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.entity.enums.PurchaseStatus;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.security.AuditDetailsHolder;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

        // Narxlarni yangilash
        updateProductUnitPrices(item.getProductUnit(), unitPriceUzs,
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
        boolean hasDebt = purchase.getDebtUsd().compareTo(BigDecimal.ZERO) > 0
                || purchase.getDebtUzs().compareTo(BigDecimal.ZERO) > 0;

        supplierDebtRepository.findByPurchaseId(purchase.getId()).ifPresentOrElse(
                debt -> {
                    debt.setAmount(purchase.getTotalAmount());
                    debt.setPaidAmount(purchase.getPaidAmount());
                    debt.setIsPaid(!hasDebt);
                    supplierDebtRepository.save(debt);
                },
                () -> {
                    if (hasDebt) {
                        SupplierDebt debt = SupplierDebt.builder()
                                .supplier(purchase.getSupplier())
                                .purchase(purchase)
                                .amount(purchase.getTotalAmount())
                                .paidAmount(purchase.getPaidAmount())
                                .isPaid(false)
                                .notes("Purchase: " + purchase.getReferenceNo())
                                .build();
                        supplierDebtRepository.save(debt);
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
}