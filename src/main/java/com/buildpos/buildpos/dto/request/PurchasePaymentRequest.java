package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PurchasePaymentRequest {

    @NotNull
    @DecimalMin(value = "0.01", message = "To'lov summasi 0 dan katta bo'lishi kerak")
    private BigDecimal amount;

    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    private String note;

    private LocalDateTime paidAt;
}