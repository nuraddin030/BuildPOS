package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.ProfitLossResponse;
import com.buildpos.buildpos.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final SaleRepository saleRepository;

    public ProfitLossResponse getProfitLoss(LocalDate from, LocalDate to) {
        LocalDateTime dtFrom = from.atStartOfDay();
        LocalDateTime dtTo   = to.atTime(LocalTime.MAX);

        // ── Asosiy ko'rsatkichlar ──────────────────────────────────
        List<Object[]> summaryList = saleRepository.getPLSummary(dtFrom, dtTo);
        Object[] summary  = (summaryList != null && !summaryList.isEmpty()) ? summaryList.get(0) : null;
        long       saleCount = (summary != null && summary[0] != null) ? ((Number) summary[0]).longValue() : 0L;
        BigDecimal revenue   = summary != null ? bd(summary[1]) : BigDecimal.ZERO;
        BigDecimal discounts = summary != null ? bd(summary[2]) : BigDecimal.ZERO;
        BigDecimal cogs      = summary != null ? bd(summary[3]) : BigDecimal.ZERO;
        BigDecimal profit    = revenue.subtract(cogs);
        BigDecimal margin    = revenue.compareTo(BigDecimal.ZERO) > 0
                ? profit.divide(revenue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal avgSale = saleCount > 0
                ? revenue.divide(BigDecimal.valueOf(saleCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // ── To'lov usullari ────────────────────────────────────────
        List<Object[]> payments = saleRepository.getPLPaymentBreakdown(dtFrom, dtTo);
        Map<String, BigDecimal> payMap = payments.stream()
                .collect(Collectors.toMap(
                        r -> r[0].toString(),
                        r -> bd(r[1])
                ));
        BigDecimal cash     = payMap.getOrDefault("CASH",     BigDecimal.ZERO);
        BigDecimal card     = payMap.getOrDefault("CARD",     BigDecimal.ZERO);
        BigDecimal transfer = payMap.getOrDefault("TRANSFER", BigDecimal.ZERO);
        BigDecimal debt     = payMap.getOrDefault("DEBT",     BigDecimal.ZERO);

        // ── Oylik trend (12 oy) ────────────────────────────────────
        LocalDateTime from12 = LocalDate.now().minusMonths(11).withDayOfMonth(1).atStartOfDay();
        List<Object[]> trendRaw = saleRepository.getPLMonthlyTrend(from12);
        Map<String, Object[]> trendMap = trendRaw.stream()
                .collect(Collectors.toMap(r -> r[0].toString(), r -> r));

        List<ProfitLossResponse.MonthlyRow> monthlyTrend = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            LocalDate   m     = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            String      key   = String.format("%d-%02d", m.getYear(), m.getMonthValue());
            String      label = m.getMonth().getDisplayName(TextStyle.SHORT, new Locale("uz"));
            Object[]    row   = trendMap.get(key);
            BigDecimal  rev   = row != null ? bd(row[1]) : BigDecimal.ZERO;
            BigDecimal  cg    = row != null ? bd(row[2]) : BigDecimal.ZERO;
            monthlyTrend.add(ProfitLossResponse.MonthlyRow.builder()
                    .month(key).label(label)
                    .revenue(rev).cogs(cg).profit(rev.subtract(cg))
                    .build());
        }

        // ── Top 10 mahsulot ────────────────────────────────────────
        List<Object[]> topRaw = saleRepository.getPLTopProducts(dtFrom, dtTo);
        List<ProfitLossResponse.ProductProfit> topProducts = topRaw.stream().map(r -> {
            BigDecimal pRev  = bd(r[3]);
            BigDecimal pCogs = bd(r[4]);
            BigDecimal pProf = bd(r[5]);
            BigDecimal pMarg = pRev.compareTo(BigDecimal.ZERO) > 0
                    ? pProf.divide(pRev, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            return ProfitLossResponse.ProductProfit.builder()
                    .productName(r[0] != null ? r[0].toString() : "")
                    .unitSymbol(r[1]  != null ? r[1].toString()  : "")
                    .quantity(bd(r[2]))
                    .revenue(pRev).cogs(pCogs).profit(pProf).margin(pMarg)
                    .build();
        }).toList();

        return ProfitLossResponse.builder()
                .revenue(revenue).cogs(cogs).grossProfit(profit).grossMargin(margin)
                .discounts(discounts).saleCount(saleCount).avgSale(avgSale)
                .cash(cash).card(card).transfer(transfer).debt(debt)
                .monthlyTrend(monthlyTrend).topProducts(topProducts)
                .build();
    }

    private BigDecimal bd(Object val) {
        if (val == null) return BigDecimal.ZERO;
        return new BigDecimal(val.toString());
    }
}