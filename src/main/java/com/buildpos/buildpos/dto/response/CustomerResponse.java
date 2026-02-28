package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CustomerResponse {

    private Long id;
    private String name;
    private String phone;
    private String notes;
    private Boolean isActive;
    private BigDecimal totalDebt;       // jami to'lanmagan qarz
    private LocalDateTime createdAt;
}