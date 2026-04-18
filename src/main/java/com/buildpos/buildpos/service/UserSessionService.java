package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.UserSession;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.RefreshTokenRepository;
import com.buildpos.buildpos.repository.UserSessionRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserSessionService {

    private final UserSessionRepository repo;
    private final RefreshTokenRepository refreshTokenRepo;
    private final com.buildpos.buildpos.security.JwtUtil jwtUtil;

    @Transactional
    public UserSession createSession(Long userId, String username, String ip, String device, String accessToken) {
        try {
            return repo.save(UserSession.builder()
                    .userId(userId)
                    .username(username)
                    .ipAddress(ip)
                    .device(device)
                    .loginAt(LocalDateTime.now())
                    .accessToken(accessToken)
                    .build());
        } catch (Exception e) {
            log.warn("Sessiya yaratishda xato: {}", e.getMessage());
            return null;
        }
    }

    // Token yangilanganda (15 daqiqada) sessiyani yangilash
    @Transactional
    public void updateAccessToken(String username, String newAccessToken) {
        try {
            repo.findTopByUsernameAndLogoutAtIsNullOrderByLoginAtDesc(username)
                    .ifPresent(s -> {
                        s.setAccessToken(newAccessToken);
                        repo.save(s);
                    });
        } catch (Exception e) {
            log.warn("Access token yangilashda xato: {}", e.getMessage());
        }
    }

    @Transactional
    public void closeSession(String username, String logoutType) {
        try {
            repo.findTopByUsernameAndLogoutAtIsNullOrderByLoginAtDesc(username)
                    .ifPresent(session -> {
                        LocalDateTime now = LocalDateTime.now();
                        long durationSec = ChronoUnit.SECONDS.between(session.getLoginAt(), now);
                        session.setLogoutAt(now);
                        session.setDurationSec(durationSec);
                        session.setLogoutType(logoutType);
                        repo.save(session);
                    });
        } catch (Exception e) {
            log.warn("Sessiya yopishda xato: {}", e.getMessage());
        }
    }

    // ── Startup: oldingi restartdan qolgan ochiq sessiyalarni yop ─────────
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void closeOrphanedSessionsOnStartup() {
        List<UserSession> open = repo.findAllOpen();
        if (open.isEmpty()) return;
        LocalDateTime now = LocalDateTime.now();
        for (UserSession s : open) {
            s.setLogoutAt(now);
            s.setDurationSec(ChronoUnit.SECONDS.between(s.getLoginAt(), now));
            s.setLogoutType("SERVER_RESTART");
        }
        repo.saveAll(open);
        log.info("Startup cleanup: {} ta yetilmagan sessiya SERVER_RESTART deb yopildi", open.size());
    }

    // ── Graceful shutdown: joriy ochiq sessiyalarni yop ──────────────────
    @PreDestroy
    @Transactional
    public void closeAllSessionsOnShutdown() {
        List<UserSession> open = repo.findAllOpen();
        if (open.isEmpty()) return;
        LocalDateTime now = LocalDateTime.now();
        for (UserSession s : open) {
            s.setLogoutAt(now);
            s.setDurationSec(ChronoUnit.SECONDS.between(s.getLoginAt(), now));
            s.setLogoutType("SERVER_SHUTDOWN");
        }
        repo.saveAll(open);
        log.info("Shutdown cleanup: {} ta sessiya SERVER_SHUTDOWN deb yopildi", open.size());
    }

    // ── Admin: UI dan sessiyani majburiy yopish + refresh token revoke ───
    @Transactional
    public UserSession forceClose(Long sessionId) {
        UserSession session = repo.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Sessiya topilmadi: " + sessionId));
        if (session.getLogoutAt() != null) return session; // allaqachon yopilgan

        // Access tokenni blacklist ga qo'shish — darhol sessiya o'ladi
        if (session.getAccessToken() != null) {
            jwtUtil.invalidate(session.getAccessToken());
        }

        // Refresh tokenni bekor qilish
        if (session.getUserId() != null) {
            refreshTokenRepo.revokeAllByUserId(session.getUserId());
        }

        LocalDateTime now = LocalDateTime.now();
        session.setLogoutAt(now);
        session.setDurationSec(ChronoUnit.SECONDS.between(session.getLoginAt(), now));
        session.setLogoutType("FORCE_CLOSED");
        session.setAccessToken(null);

        return repo.save(session);
    }

    public Page<UserSession> getSessions(String username, LocalDate from, LocalDate to, Pageable pageable) {
        LocalDateTime dtFrom = from != null ? from.atStartOfDay() : null;
        LocalDateTime dtTo   = to   != null ? to.atTime(LocalTime.MAX) : null;
        return repo.findFiltered(username, dtFrom, dtTo, pageable);
    }
}