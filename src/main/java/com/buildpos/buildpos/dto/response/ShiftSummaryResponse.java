package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ShiftSummaryResponse {

    // Smena ma'lumotlari
    private Long shiftId;
    private String cashierName;
    private String warehouseName;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private String durationFormatted;      // "3 soat 45 daqiqa"

    // Kassa
    private BigDecimal openingCash;        // smena boshlanganda
    private BigDecimal closingCash;        // smena yopilganda (haqiqiy)
    private BigDecimal cashDifference;     // closingCash - (openingCash + totalCash)

    // Sotuv statistikasi
    private Integer saleCount;             // COMPLETED sotuvlar soni
    private Integer cancelledCount;        // CANCELLED sotuvlar soni
    private Integer returnedCount;         // RETURNED sotuvlar soni
    private BigDecimal totalSales;         // jami sotuv summasi
    private BigDecimal totalDiscount;      // jami chegirma summasi
    private BigDecimal averageSale;        // o'rtacha chek

    // To'lov usullari bo'yicha breakdown
    private BigDecimal totalCash;
    private BigDecimal totalCard;
    private BigDecimal totalTransfer;
    private BigDecimal totalDebt;

    // Top 5 mahsulot
    private List<TopProductItem> topProducts;

    @Data
    @Builder
    public static class TopProductItem {
        private String productName;
        private String unitName;
        private BigDecimal totalQuantity;
        private BigDecimal totalAmount;
    }
}
