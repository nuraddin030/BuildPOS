package com.buildpos.buildpos.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProfitLossResponse {

    // ── Asosiy ko'rsatkichlar ────────────────────────────────────────
    private BigDecimal revenue;       // sotuv jami
    private BigDecimal cogs;          // sotilgan tovar tannarxi
    private BigDecimal grossProfit;   // yalpi foyda (revenue - cogs)
    private BigDecimal grossMargin;   // foyda foizi (0-100)
    private BigDecimal discounts;     // chegirmalar summasi
    private Long       saleCount;     // sotuv soni
    private BigDecimal avgSale;       // o'rtacha chek

    // ── Harajatlar ──────────────────────────────────────────────────
    private BigDecimal totalExpenses;  // davr harajatlari
    private BigDecimal netProfit;      // grossProfit - totalExpenses

    // ── To'lov usullari ─────────────────────────────────────────────
    private BigDecimal cash;
    private BigDecimal card;
    private BigDecimal transfer;
    private BigDecimal debt;

    // ── Oylik trend (12 oy) ─────────────────────────────────────────
    private List<MonthlyRow> monthlyTrend;

    // ── Top 10 foydali mahsulotlar ───────────────────────────────────
    private List<ProductProfit> topProducts;

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyRow {
        private String     month;    // "2026-01"
        private String     label;    // "Yan"
        private BigDecimal revenue;
        private BigDecimal cogs;
        private BigDecimal profit;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductProfit {
        private String     productName;
        private String     unitSymbol;
        private BigDecimal quantity;
        private BigDecimal revenue;
        private BigDecimal cogs;
        private BigDecimal profit;
        private BigDecimal margin;   // 0-100
    }
}