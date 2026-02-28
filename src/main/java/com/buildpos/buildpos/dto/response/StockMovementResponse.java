package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.StockMovementType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class StockMovementResponse {

    private Long id;

    // Mahsulot
    private Long productUnitId;
    private String productName;
    private String unitSymbol;
    private String barcode;

    // Harakat turi
    private StockMovementType movementType;

    // Omborlar
    private Long fromWarehouseId;
    private String fromWarehouseName;
    private Long toWarehouseId;
    private String toWarehouseName;

    // Miqdor va narx
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;

    // Manba
    private String referenceType;
    private Long referenceId;

    private String notes;
    private LocalDateTime movedAt;
    private String movedBy;
}
