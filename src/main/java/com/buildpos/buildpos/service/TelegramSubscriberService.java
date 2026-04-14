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
                .stream().map(this::toDto).toList();
    }

    public List<String> getActiveChatIds() {
        return repo.findAllByIsActiveTrueOrderByCreatedAtDesc()
                .stream().map(TelegramSubscriber::getChatId).toList();
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
                .build();
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
                .note(s.getNote())
                .createdAt(s.getCreatedAt())
                .build();
    }
}