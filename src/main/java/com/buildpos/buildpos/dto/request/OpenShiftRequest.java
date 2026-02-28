package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;

// Smena ochish
@Data
public class OpenShiftRequest {

    @NotNull
    private Long warehouseId;

    @PositiveOrZero
    private BigDecimal openingCash = BigDecimal.ZERO;  // kassadagi boshlang'ich naqd
}