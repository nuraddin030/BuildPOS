package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class SupplierResponse {

    private Long id;
    private String name;
    private String company;
    private String phone;
    private String address;
    private String bankAccount;
    private String inn;
    private String notes;
    private Boolean isActive;
    private BigDecimal totalDebt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}