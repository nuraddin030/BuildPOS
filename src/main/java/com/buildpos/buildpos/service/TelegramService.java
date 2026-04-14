package com.buildpos.buildpos.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final TelegramSubscriberService subscriberService;

    @Value("${telegram.bot.token:}")
    private String botToken;

    /**
     * Barcha aktiv obunachilarga xabar yuboradi
     */
    public void sendToAll(String text) {
        if (botToken.isBlank()) {
            log.warn("Telegram token yo'q — xabar yuborilmadi");
            return;
        }
        List<String> chatIds = subscriberService.getActiveChatIds();
        if (chatIds.isEmpty()) {
            log.info("Aktiv Telegram obunachi yo'q");
            return;
        }
        chatIds.forEach(chatId -> sendTo(chatId, text));
    }

    /**
     * Bitta chat ID ga xabar yuboradi (webhook handler uchun)
     */
    public void sendTo(String chatId, String text) {
        if (botToken.isBlank()) return;
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("chat_id", chatId);
            body.add("text", text);
            body.add("parse_mode", "HTML");

            restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
        } catch (Exception e) {
            log.error("Telegram xabar yuborishda xato (chatId={}): {}", chatId, e.getMessage());
        }
    }

    public String getBotToken() {
        return botToken;
    }
}