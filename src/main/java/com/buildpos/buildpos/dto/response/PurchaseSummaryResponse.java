package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.PurchaseStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PurchaseSummaryResponse {

    private Long id;
    private String referenceNo;
    private String supplierName;
    private String warehouseName;
    private PurchaseStatus status;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal debtAmount;
    private int itemCount;
    private LocalDateTime expectedAt;
    private LocalDateTime receivedAt;
    private LocalDateTime createdAt;
    private String createdBy;
}
