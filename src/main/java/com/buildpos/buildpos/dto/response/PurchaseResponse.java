package com.buildpos.buildpos.dto.response;

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

    // Legacy (backward compat — UZS qism)
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal debtAmount;

    // ✅ Multi-currency: USD va UZS alohida
    private BigDecimal totalUsd;
    private BigDecimal totalUzs;
    private BigDecimal paidUsd;
    private BigDecimal paidUzs;
    private BigDecimal debtUsd;
    private BigDecimal debtUzs;

    private String notes;
    private LocalDateTime expectedAt;
    private LocalDateTime receivedAt;
    private LocalDateTime createdAt;
    private String createdBy;

    private List<PurchaseItemResponse> items;
    private List<PurchasePaymentResponse> payments;

    @Data
    @Builder
    public static class PurchaseItemResponse {
        private Long id;
        private Long productUnitId;
        private String productName;
        private String unitSymbol;
        private String barcode;
        private BigDecimal quantity;
        private BigDecimal unitPrice;     // asl valyutada (USD yoki UZS)
        private BigDecimal unitPriceUzs;  // UZS ekvivalent
        private BigDecimal totalPrice;    // UZS da (hisoblangan)
        private String currency;
        private BigDecimal exchangeRate;
        private BigDecimal receivedQty;
        private BigDecimal remainingQty;
    }

    @Data
    @Builder
    public static class PurchasePaymentResponse {
        private Long id;
        private BigDecimal amount;
        private String currency;      // ✅ UZS yoki USD
        private String paymentMethod;
        private String note;
        private LocalDateTime paidAt;
        private String paidBy;
    }
}