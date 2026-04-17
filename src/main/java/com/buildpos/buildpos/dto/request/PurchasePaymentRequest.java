package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PurchasePaymentRequest {

    @NotNull(message = "Summa kiritilishi shart")
    @DecimalMin(value = "0.01", message = "Summa 0 dan katta bo'lishi kerak")
    private BigDecimal amount;

    @NotNull(message = "To'lov usuli kiritilishi shart")
    private PaymentMethod paymentMethod;

    // ✅ Yangi: qaysi valyutada to'lanmoqda (UZS yoki USD)
    @Pattern(regexp = "^(UZS|USD)$", message = "Valyuta UZS yoki USD bo'lishi kerak")
    private String currency = "UZS";

    private String note;
    private LocalDateTime paidAt;

    // Smena harajati (ixtiyoriy) — kassadan chiqadigan summa
    private BigDecimal shiftExpenseAmount;
}