package com.buildpos.buildpos.service;

import com.buildpos.buildpos.repository.WarehouseStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class LowStockNotifier {

    private final WarehouseStockRepository stockRepository;
    private final TelegramService telegramService;

    /**
     * Har kuni soat 08:00 da kam qolgan tovarlar haqida xabar yuboradi
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void sendLowStockAlert() {
        log.info("Kam zaxira tekshiruvi...");

        Long count = stockRepository.countLowStockItems();
        if (count == null || count == 0) {
            log.info("Kam zaxiradagi tovar yo'q");
            return;
        }

        List<Object[]> items = stockRepository.findLowStockItems();
        String msg = buildMessage(count, items);
        telegramService.sendToAll(msg);
        log.info("Kam zaxira xabari yuborildi: {} ta tovar", count);
    }

    private String buildMessage(long count, List<Object[]> items) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("⚠️ <b>Kam zaxira ogohlantirishи</b>\n\n"));
        sb.append(String.format("Jami <b>%d ta</b> mahsulot minimal darajadan kam:\n\n", count));

        for (Object[] row : items) {
            String name     = row[1] != null ? row[1].toString() : "—";
            String unit     = row[2] != null ? row[2].toString() : "";
            String warehouse = row[3] != null ? row[3].toString() : "—";
            double current  = row[4] != null ? ((Number) row[4]).doubleValue() : 0;
            double min      = row[5] != null ? ((Number) row[5]).doubleValue() : 0;

            sb.append(String.format("🔴 <b>%s</b> (%s)\n", name, unit));
            sb.append(String.format("   Zaxira: %.0f | Min: %.0f | Ombor: %s\n\n", current, min, warehouse));
        }

        if (count > 5) {
            sb.append(String.format("...va yana %d ta mahsulot\n\n", count - 5));
        }

        sb.append("👉 To'ldirish uchun POS tizimini oching.");
        return sb.toString();
    }

    public void triggerManually() {
        sendLowStockAlert();
    }
}
