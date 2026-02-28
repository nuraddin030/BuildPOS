package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CustomerDebtPaymentRequest {

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    private String notes;

    private LocalDateTime paidAt;
}