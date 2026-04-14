package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.TelegramSubscriberRequest;
import com.buildpos.buildpos.dto.response.TelegramSubscriberResponse;
import com.buildpos.buildpos.entity.TelegramSubscriber;
import com.buildpos.buildpos.repository.TelegramSubscriberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TelegramSubscriberService {

    private final TelegramSubscriberRepository repo;

    public List<TelegramSubscriberResponse> getAll() {
        return repo.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(s -> !"PENDING".equals(s.getStatus()))
                .map(this::toDto).toList();
    }

    public List<TelegramSubscriberResponse> getPending() {
        return repo.findAllByStatusOrderByCreatedAtDesc("PENDING")
                .stream().map(this::toDto).toList();
    }

    public List<String> getActiveChatIds() {
        return repo.findAllByIsActiveTrueOrderByCreatedAtDesc()
                .stream()
                .filter(s -> "ACTIVE".equals(s.getStatus()))
                .map(TelegramSubscriber::getChatId)
                .toList();
    }

    @Transactional
    public TelegramSubscriberResponse create(TelegramSubscriberRequest req) {
        if (repo.existsByChatId(req.getChatId())) {
            throw new IllegalArgumentException("Bu chat ID allaqachon ro'yxatda: " + req.getChatId());
        }
        TelegramSubscriber sub = TelegramSubscriber.builder()
                .name(req.getName())
                .chatId(req.getChatId())
                .note(req.getNote())
                .isActive(true)
                .status("ACTIVE")
                .build();
        return toDto(repo.save(sub));
    }

    /**
     * Bot orqali /start yuborgan foydalanuvchini PENDING sifatida saqlaydi.
     * Agar allaqachon mavjud bo'lsa, ma'lumotlarini yangilaydi.
     */
    @Transactional
    public TelegramSubscriber registerFromBot(String chatId, String firstName, String telegramUsername) {
        return repo.findByChatId(chatId).map(existing -> {
            // REJECTED bo'lsa yoki PENDING bo'lsa — yangilaymiz
            if ("REJECTED".equals(existing.getStatus())) {
                existing.setStatus("PENDING");
            }
            existing.setFirstName(firstName);
            existing.setTelegramUsername(telegramUsername);
            return repo.save(existing);
        }).orElseGet(() -> {
            TelegramSubscriber sub = TelegramSubscriber.builder()
                    .name(firstName != null ? firstName : "Telegram foydalanuvchi")
                    .chatId(chatId)
                    .firstName(firstName)
                    .telegramUsername(telegramUsername)
                    .isActive(false)
                    .status("PENDING")
                    .build();
            return repo.save(sub);
        });
    }

    @Transactional
    public TelegramSubscriberResponse approve(Long id) {
        TelegramSubscriber sub = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Topilmadi: " + id));
        sub.setStatus("ACTIVE");
        sub.setIsActive(true);
        return toDto(repo.save(sub));
    }

    @Transactional
    public TelegramSubscriberResponse reject(Long id) {
        TelegramSubscriber sub = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Topilmadi: " + id));
        sub.setStatus("REJECTED");
        sub.setIsActive(false);
        return toDto(repo.save(sub));
    }

    @Transactional
    public TelegramSubscriberResponse toggleActive(Long id) {
        TelegramSubscriber sub = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Topilmadi: " + id));
        sub.setIsActive(!sub.getIsActive());
        return toDto(repo.save(sub));
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }

    private TelegramSubscriberResponse toDto(TelegramSubscriber s) {
        return TelegramSubscriberResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .chatId(s.getChatId())
                .isActive(s.getIsActive())
                .status(s.getStatus())
                .firstName(s.getFirstName())
                .telegramUsername(s.getTelegramUsername())
                .note(s.getNote())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
