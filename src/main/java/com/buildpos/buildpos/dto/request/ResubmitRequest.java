package com.buildpos.buildpos.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ResubmitRequest {

    private String note;

    private List<ItemRequest> items;

    @Data
    public static class ItemRequest {
        private Long productUnitId;
        private Long warehouseId;
        private BigDecimal quantity;
        private BigDecimal salePrice;
    }
}