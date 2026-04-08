package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PriceHistoryResponse {
    private Long id;
    private String fieldName;
    private BigDecimal oldValue;
    private BigDecimal newValue;
    private LocalDateTime changedAt;
    private String changedByName;
}