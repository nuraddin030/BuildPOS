package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ExpenseResponse {
    private Long id;
    private LocalDate date;
    private Long categoryId;
    private String categoryName;
    private BigDecimal amount;
    private String note;
    private String createdByName;
    private LocalDateTime createdAt;
}