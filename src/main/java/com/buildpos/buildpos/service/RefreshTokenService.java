package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.RefreshToken;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration:604800000}") // 7 kun (ms)
    private long refreshExpirationMs;

    private final RefreshTokenRepository refreshTokenRepository;

    /** Yangi refresh token yaratadi va DB ga saqlaydi */
    @Transactional
    public RefreshToken create(User user) {
        // Eski tokenlarni bekor qilish (bir foydalanuvchi — bitta aktiv session)
        refreshTokenRepository.revokeAllByUserId(user.getId());

        RefreshToken rt = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshExpirationMs / 1000))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(rt);
    }

    /** Tokenni tekshiradi — muddati o'tmagan va bekor qilinmagan bo'lishi kerak */
    public Optional<RefreshToken> validate(String token) {
        return refreshTokenRepository.findByToken(token)
                .filter(rt -> !rt.isRevoked() && !rt.isExpired());
    }

    /** Tokenni bekor qilish (logout) */
    @Transactional
    public void revoke(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }

    /** Foydalanuvchining barcha tokenlarini bekor qilish */
    @Transactional
    public void revokeAllByUser(Long userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }
}