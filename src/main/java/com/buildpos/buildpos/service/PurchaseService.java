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
                .build();

        purchase = purchaseRepository.save(purchase);

        // Items qo'shish va jami hisoblash
        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseRequest.PurchaseItemRequest itemReq : request.getItems()) {
            ProductUnit productUnit = productUnitRepository.findById(itemReq.getProductUnitId())
                    .orElseThrow(() -> new NotFoundException("Product unit topilmadi: " + itemReq.getProductUnitId()));

            BigDecimal itemTotal = itemReq.getUnitPrice().multiply(itemReq.getQuantity());
            total = total.add(itemTotal);

            PurchaseItem item = PurchaseItem.builder()
                    .purchase(purchase)
                    .productUnit(productUnit)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .totalPrice(itemTotal)
                    .receivedQty(BigDecimal.ZERO)
                    .build();

            purchaseItemRepository.save(item);
        }

        purchase.setTotalAmount(total);
        purchase.setDebtAmount(total);
        purchaseRepository.save(purchase);

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
            PurchaseStatus status,
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
                    receiveItem(item, remaining, purchase.getWarehouse());
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

                receiveItem(item, receiveReq.getReceivedQty(), purchase.getWarehouse());
            }

            // Status yangilash
            boolean allReceived = items.stream()
                    .allMatch(i -> i.getReceivedQty().compareTo(i.getQuantity()) >= 0);
            purchase.setStatus(allReceived ? PurchaseStatus.RECEIVED : PurchaseStatus.PARTIALLY_RECEIVED);

            if (allReceived) {
                purchase.setReceivedAt(LocalDateTime.now());
            }
        }

        // Supplier debt yangilash
        updateSupplierDebt(purchase);

        return toResponse(purchaseRepository.save(purchase));
    }

    // ─────────────────────────────────────────
    // ADD PAYMENT (to'lov qo'shish)
    // ─────────────────────────────────────────
    @Transactional
    public PurchaseResponse addPayment(Long id, PurchasePaymentRequest request) {
        Purchase purchase = findById(id);

        if (purchase.getStatus() == PurchaseStatus.CANCELLED) {
            throw new BadRequestException("Bekor qilingan xaridga to'lov qo'shib bo'lmaydi");
        }

        if (request.getAmount().compareTo(purchase.getDebtAmount()) > 0) {
            throw new BadRequestException(
                    "To'lov summasi qarzdan oshib ketdi. Maksimal: " + purchase.getDebtAmount()
            );
        }

        PurchasePayment payment = PurchasePayment.builder()
                .purchase(purchase)
                .supplier(purchase.getSupplier())
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .note(request.getNote())
                .paidAt(request.getPaidAt() != null ? request.getPaidAt() : LocalDateTime.now())
                .build();

        purchasePaymentRepository.save(payment);

        // Purchase summasini yangilash
        BigDecimal newPaid = purchase.getPaidAmount().add(request.getAmount());
        purchase.setPaidAmount(newPaid);
        purchase.setDebtAmount(purchase.getTotalAmount().subtract(newPaid));
        purchaseRepository.save(purchase);

        // Supplier debt yangilash
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
    private void receiveItem(PurchaseItem item, BigDecimal qty, Warehouse warehouse) {
        // Stock ko'tarish
        WarehouseStock stock = warehouseStockRepository
                .findByWarehouseIdAndProductUnitId(warehouse.getId(), item.getProductUnit().getId())
                .orElseGet(() -> WarehouseStock.builder()
                        .warehouse(warehouse)
                        .productUnit(item.getProductUnit())
                        .quantity(BigDecimal.ZERO)
                        .minStock(BigDecimal.ZERO)
                        .build());

        stock.setQuantity(stock.getQuantity().add(qty));
        warehouseStockRepository.save(stock);

        // Stock movement yozish
        StockMovement movement = StockMovement.builder()
                .productUnit(item.getProductUnit())
                .movementType(StockMovementType.PURCHASE_IN)
                .toWarehouse(warehouse)
                .quantity(qty)
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getUnitPrice().multiply(qty))
                .referenceType("PURCHASE")
                .referenceId(item.getPurchase().getId())
                .build();
        stockMovementRepository.save(movement);

        // Item received qty yangilash
        item.setReceivedQty(item.getReceivedQty().add(qty));
        purchaseItemRepository.save(item);

        // Product cost price yangilash (avg yoki oxirgi narx)
        item.getProductUnit().setCostPrice(item.getUnitPrice());
        productUnitRepository.save(item.getProductUnit());
    }

    private void updateSupplierDebt(Purchase purchase) {
        if (purchase.getDebtAmount().compareTo(BigDecimal.ZERO) > 0) {
            // Supplier debt yozuv mavjudligini tekshirish
            supplierDebtRepository.findByPurchaseId(purchase.getId()).ifPresentOrElse(
                    debt -> {
                        debt.setAmount(purchase.getTotalAmount());
                        debt.setPaidAmount(purchase.getPaidAmount());
                        debt.setIsPaid(purchase.getDebtAmount().compareTo(BigDecimal.ZERO) == 0);
                        supplierDebtRepository.save(debt);
                    },
                    () -> {
                        SupplierDebt debt = SupplierDebt.builder()
                                .supplier(purchase.getSupplier())
                                .amount(purchase.getTotalAmount())
                                .paidAmount(purchase.getPaidAmount())
                                .isPaid(false)
                                .notes("Purchase: " + purchase.getReferenceNo())
                                .build();
                        supplierDebtRepository.save(debt);
                    }
            );
        }
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
                        .receivedQty(item.getReceivedQty())
                        .remainingQty(item.getQuantity().subtract(item.getReceivedQty()))
                        .build()).toList())
                .payments(payments.stream().map(p -> PurchaseResponse.PurchasePaymentResponse.builder()
                        .id(p.getId())
                        .amount(p.getAmount())
                        .paymentMethod(p.getPaymentMethod())
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
                .itemCount(purchase.getItems().size())
                .expectedAt(purchase.getExpectedAt())
                .receivedAt(purchase.getReceivedAt())
                .createdAt(purchase.getCreatedAt())
                .createdBy(purchase.getCreatedBy() != null ? purchase.getCreatedBy().getUsername() : null)
                .build();
    }
}
