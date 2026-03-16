package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class TodayStatsResponse {
    private Long saleCount;           // COMPLETED sotuvlar soni
    private BigDecimal totalAmount;   // jami sotuv summasi
    private BigDecimal totalDiscount; // jami chegirma
    private Long cancelledCount;      // bekor qilinganlar
    private Long returnedCount;       // qaytarilganlar

    // To'lov usullari
    private BigDecimal totalCash;
    private BigDecimal totalCard;
    private BigDecimal totalTransfer;
    private BigDecimal totalDebt;
}
