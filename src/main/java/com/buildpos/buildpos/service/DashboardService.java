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
        LocalDateTime now        = LocalDateTime.now();
        LocalDateTime startOfDay = now.with(LocalTime.MIN);
        LocalDateTime endOfDay   = now.with(LocalTime.MAX);
        LocalDateTime startOfMonth = now.withDayOfMonth(1).with(LocalTime.MIN);
        LocalDateTime weekAgo    = now.minusDays(6).with(LocalTime.MIN);

        // ── Bugungi sotuv ──────────────────────────────────────
        Long       todaySaleCount  = saleRepository.countTodaySales(startOfDay, endOfDay);
        BigDecimal todaySaleAmount = saleRepository.sumTodaySales(startOfDay, endOfDay);

        BigDecimal todayCash     = saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "CASH");
        BigDecimal todayCard     = saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "CARD");
        BigDecimal todayTransfer = saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "TRANSFER");

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

        // ── Haftalik sotuv grafigi ─────────────────────────────
        List<Object[]> weeklyRaw = saleRepository.getWeeklySales(weekAgo);
        List<DashboardResponse.DailySaleResponse> weeklySales = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate date    = LocalDate.now().minusDays(i);
            String    dateStr = date.toString();
            String    dayName = date.getDayOfWeek()
                    .getDisplayName(java.time.format.TextStyle.FULL, new Locale("uz"));

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
                .todayTransactionCount(todaySaleCount)
                .todayAvgSale(todayAvgSale)
                .monthSaleAmount(monthSaleAmount)
                .totalCustomerDebt(totalCustomerDebt)
                .openDebtCount(openDebtCount)
                .overdueDebtCount(overdueDebtCount)
                .overdueDebtAmount(overdueDebtAmount)
                .totalSupplierDebt(totalSupplierDebt)
                .lowStockCount(lowStockCount)
                .weeklySales(weeklySales)
                .recentSales(recentSales)
                .build();
    }
}