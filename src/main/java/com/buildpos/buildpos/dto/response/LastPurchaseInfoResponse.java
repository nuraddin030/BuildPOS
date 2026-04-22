package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class LastPurchaseInfoResponse {

    private BigDecimal unitPrice;
    private String currency;
    private BigDecimal exchangeRate;

    private Long supplierId;
    private String supplierName;
    private LocalDateTime purchaseDate;

    private boolean sameSupplier;
}
