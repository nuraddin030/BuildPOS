package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.DashboardResponse;
import com.buildpos.buildpos.dto.response.SaleResponse;
import com.buildpos.buildpos.repository.CustomerDebtRepository;
import com.buildpos.buildpos.repository.PurchaseRepository;
import com.buildpos.buildpos.repository.SaleRepository;
import com.buildpos.buildpos.repository.WarehouseStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final SaleRepository saleRepository;
    private final CustomerDebtRepository customerDebtRepository;
    private final PurchaseRepository purchaseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final SaleService saleService;

    public DashboardResponse getDashboard() {
        LocalDateTime now          = LocalDateTime.now();
        LocalDateTime startOfDay   = now.with(LocalTime.MIN);
        LocalDateTime endOfDay     = now.with(LocalTime.MAX);
        LocalDateTime startOfMonth = now.withDayOfMonth(1).with(LocalTime.MIN);
        LocalDateTime weekAgo      = now.minusDays(6).with(LocalTime.MIN);

        // ── Bugungi sotuv ──────────────────────────────────────
        Long       todaySaleCount  = saleRepository.countTodaySales(startOfDay, endOfDay);
        BigDecimal todaySaleAmount = saleRepository.sumTodaySales(startOfDay, endOfDay);

        BigDecimal todayCash     = saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "CASH");
        BigDecimal todayCard     = saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "CARD");
        BigDecimal todayTransfer = saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "TRANSFER");
        BigDecimal todayDebt     = saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "DEBT");

        BigDecimal todayAvgSale = todaySaleCount > 0
                ? todaySaleAmount.divide(BigDecimal.valueOf(todaySaleCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // ── Oy davomida ────────────────────────────────────────
        BigDecimal monthSaleAmount = saleRepository.sumMonthSales(startOfMonth);

        // ── Nasiya holati ──────────────────────────────────────
        BigDecimal totalCustomerDebt  = customerDebtRepository.sumTotalRemainingDebt();
        Long       openDebtCount      = customerDebtRepository.countOpenDebts();
        Long       overdueDebtCount   = customerDebtRepository.countOverdueDebts(LocalDate.now());
        BigDecimal overdueDebtAmount  = customerDebtRepository.sumOverdueDebtAmount(LocalDate.now());

        // ── Yetkazuvchi qarzi ──────────────────────────────────
        BigDecimal totalSupplierDebt = purchaseRepository.sumTotalSupplierDebt();

        // ── Kam zaxira ─────────────────────────────────────────
        Long lowStockCount = warehouseStockRepository.countLowStockItems();
        List<DashboardResponse.LowStockItem> lowStockItems = buildLowStockItems();

        // ── Top mahsulotlar (bugun) ────────────────────────────
        List<DashboardResponse.TopProductItem> topProducts = buildTopProducts(startOfDay, endOfDay);

        // ── So'nggi xaridlar ───────────────────────────────────
        List<DashboardResponse.RecentPurchaseItem> recentPurchases = buildRecentPurchases();

        // ── Haftalik sotuv grafigi ─────────────────────────────
        List<Object[]> weeklyRaw = saleRepository.getWeeklySales(weekAgo);
        List<DashboardResponse.DailySaleResponse> weeklySales = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate date    = LocalDate.now().minusDays(i);
            String    dateStr = date.toString();
            String    dayName = date.getDayOfWeek()
                    .getDisplayName(java.time.format.TextStyle.SHORT, new Locale("uz"));

            BigDecimal amount = BigDecimal.ZERO;
            Long       count  = 0L;

            for (Object[] row : weeklyRaw) {
                if (dateStr.equals(row[0].toString())) {
                    amount = new BigDecimal(row[1].toString());
                    count  = Long.parseLong(row[2].toString());
                    break;
                }
            }

            weeklySales.add(DashboardResponse.DailySaleResponse.builder()
                    .day(dayName)
                    .date(dateStr)
                    .amount(amount)
                    .count(count)
                    .build());
        }

        // ── So'nggi 5 sotuv ────────────────────────────────────
        List<SaleResponse> recentSales = saleRepository
                .findRecentSales(PageRequest.of(0, 5))
                .stream()
                .map(saleService::toResponsePublic)
                .toList();

        return DashboardResponse.builder()
                .todaySaleCount(todaySaleCount)
                .todaySaleAmount(todaySaleAmount)
                .todayCash(todayCash)
                .todayCard(todayCard)
                .todayTransfer(todayTransfer)
                .todayDebt(todayDebt)
                .todayTransactionCount(todaySaleCount)
                .todayAvgSale(todayAvgSale)
                .monthSaleAmount(monthSaleAmount)
                .totalCustomerDebt(totalCustomerDebt)
                .openDebtCount(openDebtCount)
                .overdueDebtCount(overdueDebtCount)
                .overdueDebtAmount(overdueDebtAmount)
                .totalSupplierDebt(totalSupplierDebt)
                .lowStockCount(lowStockCount)
                .lowStockItems(lowStockItems)
                .topProducts(topProducts)
                .recentPurchases(recentPurchases)
                .weeklySales(weeklySales)
                .recentSales(recentSales)
                .build();
    }

    // ─────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────
    private List<DashboardResponse.TopProductItem> buildTopProducts(LocalDateTime from, LocalDateTime to) {
        try {
            List<Object[]> rows = saleRepository.findTopProductsToday(from, to);
            return rows.stream().limit(5).map(row -> DashboardResponse.TopProductItem.builder()
                    .productName(row[0] != null ? row[0].toString() : "")
                    .unitSymbol(row[1] != null ? row[1].toString() : "")
                    .totalQuantity(row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO)
                    .totalAmount(row[3] != null ? new BigDecimal(row[3].toString()) : BigDecimal.ZERO)
                    .build()).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<DashboardResponse.LowStockItem> buildLowStockItems() {
        try {
            List<Object[]> rows = warehouseStockRepository.findLowStockItems();
            return rows.stream().limit(5).map(row -> DashboardResponse.LowStockItem.builder()
                    .productUnitId(row[0] != null ? ((Number) row[0]).longValue() : null)
                    .productName(row[1] != null ? row[1].toString() : "")
                    .unitSymbol(row[2] != null ? row[2].toString() : "")
                    .warehouseName(row[3] != null ? row[3].toString() : "")
                    .currentStock(row[4] != null ? new BigDecimal(row[4].toString()) : BigDecimal.ZERO)
                    .minStock(row[5] != null ? new BigDecimal(row[5].toString()) : BigDecimal.ZERO)
                    .build()).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<DashboardResponse.RecentPurchaseItem> buildRecentPurchases() {
        try {
            return purchaseRepository.findRecentPurchases(PageRequest.of(0, 5))
                    .stream().map(p -> DashboardResponse.RecentPurchaseItem.builder()
                            .id(p.getId())
                            .referenceNo(p.getReferenceNo())
                            .supplierName(p.getSupplier() != null ? p.getSupplier().getName() : "")
                            .status(p.getStatus() != null ? p.getStatus().name() : "")
                            .totalAmount(p.getTotalUzs() != null ? p.getTotalUzs() : BigDecimal.ZERO)
                            .createdAt(p.getCreatedAt() != null ? p.getCreatedAt().toLocalDate().toString() : "")
                            .build()).toList();
        } catch (Exception e) {
            return List.of();
        }
    }
}