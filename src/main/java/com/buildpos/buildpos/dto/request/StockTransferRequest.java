package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

// ─────────────────────────────────────────────
// Omborlar orasida ko'chirish
// ─────────────────────────────────────────────
@Data
public class StockTransferRequest {

    @NotNull
    private Long productUnitId;

    @NotNull
    private Long fromWarehouseId;

    @NotNull
    private Long toWarehouseId;

    @NotNull
    @DecimalMin(value = "0.01", message = "Miqdor 0 dan katta bo'lishi kerak")
    private BigDecimal quantity;

    private String notes;
}
