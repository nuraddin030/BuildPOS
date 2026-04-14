package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.entity.TelegramSubscriber;
import com.buildpos.buildpos.service.TelegramService;
import com.buildpos.buildpos.service.TelegramSubscriberService;
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
    private final TelegramSubscriberService subscriberService;

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
                Object usernameObj = chat.get("username");
                String username    = usernameObj != null ? usernameObj.toString() : null;

                TelegramSubscriber saved = subscriberService.registerFromBot(chatId, firstName, username);

                String reply;
                if ("ACTIVE".equals(saved.getStatus())) {
                    reply = String.format(
                            "Salom, %s! 👋\n\n" +
                            "Siz allaqachon tizimga ulangansiz.\n" +
                            "Xabarlarni qabul qilishda davom etasiz.",
                            firstName);
                } else {
                    reply = String.format(
                            "Salom, %s! 👋\n\n" +
                            "So'rovingiz adminga yuborildi.\n" +
                            "Tasdiqlangandan so'ng xabarlar kela boshlaydi.",
                            firstName);
                }
                telegramService.sendTo(chatId, reply);
                log.info("Webhook: /start — chatId={}, name={}, status={}", chatId, firstName, saved.getStatus());
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