package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class DashboardResponse {

    // ─────────────────────────────────────────
    // Bugungi sotuv
    // ─────────────────────────────────────────
    private Long todaySaleCount;
    private BigDecimal todaySaleAmount;

    // Bugungi tushumlar (to'lov usuli bo'yicha)
    private BigDecimal todayCash;
    private BigDecimal todayCard;
    private BigDecimal todayTransfer;

    // Bugungi tranzaksiyalar
    private Long todayTransactionCount;
    private BigDecimal todayAvgSale;

    // ─────────────────────────────────────────
    // Oy davomida
    // ─────────────────────────────────────────
    private BigDecimal monthSaleAmount;

    // ─────────────────────────────────────────
    // Nasiya holati
    // ─────────────────────────────────────────
    private BigDecimal totalCustomerDebt;      // Jami mijoz qarzi
    private Long openDebtCount;               // Ochiq nasiyalar soni
    private Long overdueDebtCount;            // Muddati o'tgan nasiyalar soni
    private BigDecimal overdueDebtAmount;     // Muddati o'tgan nasiyalar summasi

    // ─────────────────────────────────────────
    // Yetkazuvchi qarzi
    // ─────────────────────────────────────────
    private BigDecimal totalSupplierDebt;

    // ─────────────────────────────────────────
    // Ombor
    // ─────────────────────────────────────────
    private Long lowStockCount;

    // ─────────────────────────────────────────
    // Haftalik sotuv grafigi (oxirgi 7 kun)
    // ─────────────────────────────────────────
    private List<DailySaleResponse> weeklySales;

    // ─────────────────────────────────────────
    // So'nggi sotuvlar
    // ─────────────────────────────────────────
    private List<SaleResponse> recentSales;

    // ─────────────────────────────────────────
    // Ichki DTO
    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class DailySaleResponse {
        private String day;        // "Dushanba", "Seshanba", ...
        private String date;       // "2026-03-01"
        private BigDecimal amount;
        private Long count;
    }
}
