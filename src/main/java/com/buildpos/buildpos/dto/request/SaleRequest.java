package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.DiscountType;
import com.buildpos.buildpos.entity.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// ─────────────────────────────────────────────
// Yangi savatcha yaratish
// ─────────────────────────────────────────────
@Data
public class SaleRequest {

    @NotNull(message = "Ombor tanlanishi kerak")
    private Long warehouseId;

    private Long customerId;

    private Long partnerId;

    @NotEmpty(message = "Kamida bitta mahsulot bo'lishi kerak")
    @Valid
    private List<SaleItemRequest> items;

    // Umumiy chegirma (ixtiyoriy)
    private DiscountType discountType;
    private BigDecimal discountValue;

    // To'lovlar
    @Valid
    private List<SalePaymentRequest> payments;

    private String notes;

    // ─────────────────────────────────────────
    // Bitta mahsulot
    // ─────────────────────────────────────────
    @Data
    public static class SaleItemRequest {

        @NotNull
        private Long productUnitId;

        @NotNull
        private Long warehouseId;

        @NotNull
        @DecimalMin(value = "0.001")
        private BigDecimal quantity;

        private BigDecimal salePrice;

        private DiscountType discountType;
        private BigDecimal discountValue;
    }

    // ─────────────────────────────────────────
    // Bitta to'lov
    // ─────────────────────────────────────────
    @Data
    public static class SalePaymentRequest {

        @NotNull
        private PaymentMethod paymentMethod;

        @NotNull
        @DecimalMin(value = "0.01")
        private BigDecimal amount;

        // Faqat DEBT uchun — nasiya muddati
        private LocalDate dueDate;

        private String notes;
    }
}