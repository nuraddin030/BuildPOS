package com.buildpos.buildpos.service;

import com.buildpos.buildpos.repository.CustomerDebtRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DebtReminderScheduler {

    private final CustomerDebtRepository debtRepository;
    private final TelegramService telegramService;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    /**
     * Har kuni soat 09:00 da muddati o'tgan nasiyalar haqida xabar yuboradi
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDailyDebtReminder() {
        log.info("Kunlik nasiya eslatmasi yuborilmoqda...");

        LocalDate today = LocalDate.now();
        long overdueCount = debtRepository.countOverdueDebts(today);
        BigDecimal overdueTotal = debtRepository.sumOverdueDebtAmount(today);

        long openCount = debtRepository.countOpenDebts();
        BigDecimal openTotal = debtRepository.sumTotalRemainingDebt();

        String msg = buildMessage(today, overdueCount, overdueTotal, openCount, openTotal);
        telegramService.sendToAll(msg);
        log.info("Nasiya eslatmasi yuborildi: {} ta muddati o'tgan", overdueCount);
    }

    private String buildMessage(LocalDate today, long overdueCount, BigDecimal overdueTotal,
                                 long openCount, BigDecimal openTotal) {
        String todayStr = today.format(FMT);
        String overdueIcon = overdueCount > 0 ? "🔴" : "✅";
        String overdueLabel = overdueCount > 0
                ? overdueCount + " ta nasiya\n   Summa: <b>" + fmt(overdueTotal) + " UZS</b>"
                : "Yo'q";

        return String.format("""
                📊 <b>Kunlik nasiya hisoboti — %s</b>

                %s <b>Muddati o'tgan:</b> %s

                📋 <b>Jami ochiq nasiyalar:</b> %d ta
                   Summa: <b>%s UZS</b>

                👉 <a href="https://primestroy.uz/debts">Nasiyalar bo'limini ochish</a>""",
                todayStr,
                overdueIcon, overdueLabel,
                openCount,
                fmt(openTotal)
        );
    }

    private String fmt(BigDecimal n) {
        if (n == null) return "0";
        return String.format("%,.0f", n).replace(",", " ");
    }

    /**
     * Test uchun — manual trigger (development only)
     */
    public void triggerManually() {
        sendDailyDebtReminder();
    }
}