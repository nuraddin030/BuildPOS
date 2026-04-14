package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.service.TelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Telegram dan kelgan xabarlarni qabul qiladi.
 * Foydalanuvchi /start yozsa → bot uning chat_id ini javob qaytaradi.
 *
 * Webhook ro'yxatdan o'tkazish (bir marta):
 *   POST https://api.telegram.org/bot{TOKEN}/setWebhook
 *   Body: {"url": "https://primestroy.uz/api/telegram/webhook"}
 */
@RestController
@RequestMapping("/api/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramService telegramService;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody Map<String, Object> update) {
        try {
            Map<?, ?> message = (Map<?, ?>) update.get("message");
            if (message == null) return ResponseEntity.ok("ok");

            Map<?, ?> chat = (Map<?, ?>) message.get("chat");
            if (chat == null) return ResponseEntity.ok("ok");

            String chatId    = String.valueOf(chat.get("id"));
            Object textObj   = message.get("text");
            String text      = textObj != null ? textObj.toString() : "";
            Object nameObj   = chat.get("first_name");
            String firstName = nameObj != null ? nameObj.toString() : "";

            if (text.startsWith("/start") || text.startsWith("/myid") || text.startsWith("/id")) {
                String reply = String.format(
                        "Salom, %s! 👋\n\n" +
                        "Sizning Telegram Chat ID:\n" +
                        "<code>%s</code>\n\n" +
                        "Bu ID ni POS tizimidagi Sozlamalar sahifasiga kiriting.",
                        firstName, chatId
                );
                telegramService.sendTo(chatId, reply);
                log.info("Webhook: /start — chatId={}, name={}", chatId, firstName);
            }
        } catch (Exception e) {
            log.warn("Webhook xatosi: {}", e.getMessage());
        }
        return ResponseEntity.ok("ok");
    }

    /**
     * Webhook URL ni Telegram ga ro'yxatdan o'tkazish (admin uchun)
     */
    @PostMapping("/register-webhook")
    public ResponseEntity<String> registerWebhook(@RequestParam String url) {
        try {
            String token = telegramService.getBotToken();
            if (token.isBlank()) return ResponseEntity.badRequest().body("Token yo'q");

            String apiUrl = "https://api.telegram.org/bot" + token + "/setWebhook?url=" + url + "/api/telegram/webhook";
            org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
            String result = rt.postForObject(apiUrl, null, String.class);
            log.info("Webhook ro'yxatdan o'tkazildi: {}", result);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
}