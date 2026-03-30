package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.DiscountType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ega PENDING buyurtmani tasdiqlaydi:
 * to'lov usuli, chegirma, ixtiyoriy mijoz.
 */
@Data
public class ApprovePendingRequest {

    // Ixtiyoriy: ega mijozni o'zgartirsa yoki birinchi marta belgilasa
    private Long customerId;

    // Ixtiyoriy: ega chegirma bersa
    private DiscountType discountType;
    private BigDecimal discountValue;

    // Kamida bitta to'lov
    @NotEmpty(message = "Kamida bitta to'lov kiritilishi kerak")
    @Valid
    private List<SaleRequest.SalePaymentRequest> payments;

    private String notes;
}