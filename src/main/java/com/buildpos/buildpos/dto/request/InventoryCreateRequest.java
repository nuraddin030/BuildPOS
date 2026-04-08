package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InventoryCreateRequest {
    @NotNull
    private Long warehouseId;
    private String notes;
}