package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class InventorySessionResponse {
    private Long id;
    private Long warehouseId;
    private String warehouseName;
    private String status;
    private String notes;
    private String createdByName;
    private String completedByName;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private int totalItems;
    private int filledItems;
    private List<ItemDto> items;

    @Data
    @Builder
    public static class ItemDto {
        private Long id;
        private Long productUnitId;
        private String productName;
        private String unitSymbol;
        private BigDecimal systemQty;
        private BigDecimal actualQty;
        private BigDecimal difference;
        private String notes;
    }
}