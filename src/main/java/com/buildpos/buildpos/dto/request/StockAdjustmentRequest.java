package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.StockMovementType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

// ─────────────────────────────────────────────
// Qo'lda stock o'zgartirish (inventarizatsiya)
// ─────────────────────────────────────────────
@Data
public class StockAdjustmentRequest {

    @NotNull
    private Long productUnitId;

    @NotNull
    private Long warehouseId;

    @NotNull
    private StockMovementType movementType;   // ADJUSTMENT_IN yoki ADJUSTMENT_OUT

    @NotNull
    @DecimalMin(value = "0.01", message = "Miqdor 0 dan katta bo'lishi kerak")
    private BigDecimal quantity;

    private BigDecimal unitPrice;
    private String notes;
}
