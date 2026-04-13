package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.TokenBlacklist;
import com.buildpos.buildpos.repository.TokenBlacklistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final TokenBlacklistRepository repository;

    /** JWT tokenni blacklist ga qo'shish (logout) */
    @Transactional
    public void add(String token, LocalDateTime expiresAt) {
        String hash = sha256(token);
        if (!repository.existsByTokenHash(hash)) {
            repository.save(TokenBlacklist.builder()
                    .tokenHash(hash)
                    .expiresAt(expiresAt)
                    .build());
        }
    }

    /** Token blacklist da borligini tekshirish */
    public boolean contains(String token) {
        return repository.existsByTokenHash(sha256(token));
    }

    /** Har kecha 02:00 da muddati o'tgan tokenlarni tozalash */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanup() {
        repository.deleteExpired(LocalDateTime.now());
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}