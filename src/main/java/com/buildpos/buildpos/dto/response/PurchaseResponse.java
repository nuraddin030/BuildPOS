package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.PaymentMethod;
import com.buildpos.buildpos.entity.enums.PurchaseStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PurchaseResponse {

    private Long id;
    private String referenceNo;

    private Long supplierId;
    private String supplierName;

    private Long warehouseId;
    private String warehouseName;

    private PurchaseStatus status;

    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal debtAmount;

    private String notes;
    private LocalDateTime expectedAt;
    private LocalDateTime receivedAt;

    private List<PurchaseItemResponse> items;
    private List<PurchasePaymentResponse> payments;

    private LocalDateTime createdAt;
    private String createdBy;

    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class PurchaseItemResponse {
        private Long id;
        private Long productUnitId;
        private String productName;
        private String unitSymbol;
        private String barcode;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private BigDecimal receivedQty;
        private BigDecimal remainingQty;   // quantity - receivedQty
    }

    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class PurchasePaymentResponse {
        private Long id;
        private BigDecimal amount;
        private PaymentMethod paymentMethod;
        private String note;
        private LocalDateTime paidAt;
        private String paidBy;
    }
}
