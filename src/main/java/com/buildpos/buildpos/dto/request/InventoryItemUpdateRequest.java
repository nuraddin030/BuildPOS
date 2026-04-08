package com.buildpos.buildpos.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryItemUpdateRequest {
    private BigDecimal actualQty;
    private String notes;
}