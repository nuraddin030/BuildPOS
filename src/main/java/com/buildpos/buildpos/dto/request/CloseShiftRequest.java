package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;

// Smena yopish
@Data
public class CloseShiftRequest {

    @PositiveOrZero
    private BigDecimal closingCash = BigDecimal.ZERO;  // kassadagi haqiqiy naqd

    private String notes;
}
