package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class InstallmentResponse {
    private Long id;
    private Long customerDebtId;
    private Integer installmentNumber;
    private LocalDate dueDate;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private Boolean isPaid;
    private Boolean isOverdue;
    private LocalDateTime paidAt;
    private String notes;
    private LocalDateTime createdAt;
}