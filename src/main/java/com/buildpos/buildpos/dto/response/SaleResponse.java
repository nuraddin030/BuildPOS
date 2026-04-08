package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.PaymentMethod;
import com.buildpos.buildpos.entity.enums.DiscountType;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SaleResponse {

    private Long id;
    private String referenceNo;

    private Long shiftId;
    private Long cashierId;
    private String cashierName;
    private Long sellerId;
    private String sellerName;

    private Long customerId;
    private String customerName;
    private String customerPhone;

    private Long partnerId;
    private String partnerName;
    private String partnerPhone;

    private Long warehouseId;
    private String warehouseName;

    private SaleStatus status;

    // Summalar
    private BigDecimal subtotal;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal debtAmount;
    private BigDecimal changeAmount;    // qaytim

    private String notes;
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    private List<SaleItemResponse> items;
    private List<SalePaymentResponse> payments;
    private List<SaleNoteResponse> saleNotes;

    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class SaleNoteResponse {
        private Long id;
        private Long senderId;
        private String senderName;
        private String message;
        private LocalDateTime createdAt;
    }

    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class SaleItemResponse {
        private Long id;
        private Long productUnitId;
        private String productName;
        private String unitSymbol;
        private String barcode;
        private Long warehouseId;
        private String warehouseName;
        private BigDecimal quantity;
        private BigDecimal originalPrice;
        private BigDecimal salePrice;
        private BigDecimal minPrice;
        private DiscountType discountType;
        private BigDecimal discountValue;
        private BigDecimal discountAmount;
        private BigDecimal totalPrice;
        private BigDecimal returnedQuantity; // necha dona qaytarildi
        private BigDecimal availableStock;   // ombordagi qoldiq (real vaqt)
    }

    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class SalePaymentResponse {
        private Long id;
        private PaymentMethod paymentMethod;
        private BigDecimal amount;
        private String notes;
        private LocalDate dueDate;   // faqat DEBT uchun
    }
}