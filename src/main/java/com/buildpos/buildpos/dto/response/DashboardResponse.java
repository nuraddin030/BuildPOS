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
    private BigDecimal todayDebt;          // ← YANGI: bugungi nasiya summasi

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
    private BigDecimal totalCustomerDebt;
    private Long openDebtCount;
    private Long overdueDebtCount;
    private BigDecimal overdueDebtAmount;

    // ─────────────────────────────────────────
    // Yetkazuvchi qarzi
    // ─────────────────────────────────────────
    private BigDecimal totalSupplierDebt;

    // ─────────────────────────────────────────
    // Ombor
    // ─────────────────────────────────────────
    private Long lowStockCount;
    private List<LowStockItem> lowStockItems;  // ← YANGI: kam qolgan mahsulotlar

    // ─────────────────────────────────────────
    // Top mahsulotlar (bugun)
    // ─────────────────────────────────────────
    private List<TopProductItem> topProducts;  // ← YANGI

    // ─────────────────────────────────────────
    // So'nggi xaridlar
    // ─────────────────────────────────────────
    private List<RecentPurchaseItem> recentPurchases; // ← YANGI

    // ─────────────────────────────────────────
    // Haftalik sotuv grafigi (oxirgi 7 kun)
    // ─────────────────────────────────────────
    private List<DailySaleResponse> weeklySales;

    // ─────────────────────────────────────────
    // So'nggi sotuvlar
    // ─────────────────────────────────────────
    private List<SaleResponse> recentSales;

    // ─────────────────────────────────────────
    // Ichki DTO lar
    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class DailySaleResponse {
        private String day;
        private String date;
        private BigDecimal amount;
        private Long count;
    }

    @Data
    @Builder
    public static class TopProductItem {
        private String productName;
        private String unitSymbol;
        private BigDecimal totalQuantity;
        private BigDecimal totalAmount;
    }

    @Data
    @Builder
    public static class LowStockItem {
        private Long productUnitId;
        private String productName;
        private String unitSymbol;
        private String warehouseName;
        private BigDecimal currentStock;
        private BigDecimal minStock;
    }

    @Data
    @Builder
    public static class RecentPurchaseItem {
        private Long id;
        private String referenceNo;
        private String supplierName;
        private String status;
        private BigDecimal totalAmount;
        private String createdAt;
    }
}