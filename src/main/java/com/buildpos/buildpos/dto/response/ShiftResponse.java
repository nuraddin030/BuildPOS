package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.ShiftStatus;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// ─────────────────────────────────────────────
// ShiftResponse
// ─────────────────────────────────────────────
@Data
@Builder
public class ShiftResponse {

    private Long id;
    private Long cashierId;
    private String cashierName;
    private Long warehouseId;
    private String warehouseName;
    private ShiftStatus status;
    private BigDecimal openingCash;
    private BigDecimal closingCash;
    private BigDecimal totalSales;
    private BigDecimal totalCash;
    private BigDecimal totalCard;
    private BigDecimal totalTransfer;
    private BigDecimal totalDebt;
    private Integer saleCount;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private String notes;
}
