package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CustomerDebtResponse {

    private Long id;
    private Long saleId;
    private String saleReferenceNo;

    private BigDecimal amount;          // Dastlabki qarz
    private BigDecimal paidAmount;      // To'langan
    private BigDecimal remainingAmount; // Qolgan

    private LocalDate dueDate;          // To'lov muddati
    private Boolean isPaid;
    private Boolean isOverdue;          // Muddati o'tganmi

    private LocalDateTime createdAt;

    private List<PaymentHistoryItem> payments;

    @Data
    @Builder
    public static class PaymentHistoryItem {
        private Long id;
        private BigDecimal amount;
        private String paymentMethod;
        private String notes;
        private LocalDateTime paidAt;
        private String paidBy;
    }
}
