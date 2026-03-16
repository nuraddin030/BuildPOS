package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class SupplierDebtResponse {

    private Long id;

    // Yetkazuvchi ma'lumotlari
    private Long supplierId;
    private String supplierName;
    private String supplierPhone;

    // Xarid ma'lumotlari
    private Long purchaseId;
    private String purchaseReferenceNo;

    private BigDecimal amount;          // Dastlabki qarz
    private BigDecimal paidAmount;      // To'langan
    private BigDecimal remainingAmount; // Qolgan

    private LocalDate dueDate;
    private Boolean isPaid;
    private Boolean isOverdue;

    private String notes;
    private LocalDateTime createdAt;
}