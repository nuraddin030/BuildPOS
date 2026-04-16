package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.LoginRequest;
import com.buildpos.buildpos.dto.LoginResponse;
import com.buildpos.buildpos.entity.AuditLog;
import com.buildpos.buildpos.entity.RefreshToken;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.repository.AuditLogRepository;
import com.buildpos.buildpos.repository.UserRepository;
import com.buildpos.buildpos.security.JwtUtil;
import com.buildpos.buildpos.service.RefreshTokenService;
import com.buildpos.buildpos.service.TelegramService;
import com.buildpos.buildpos.service.UserSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

// 5 ta noto'g'ri paroldan keyin 15 daqiqa bloklash
// Muvaffaqiyatli kirishda hisoblagich tozalanadi

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Autentifikatsiya")
public class AuthController {

    private static final int    MAX_ATTEMPTS   = 5;
    private static final int    LOCK_MINUTES   = 15;

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogRepository auditLogRepository;
    private final TelegramService telegramService;
    private final UserSessionService userSessionService;

    @PostMapping("/login")
    @Operation(summary = "Tizimga kirish")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest httpRequest) {

        String ip = getClientIp(httpRequest);

        // Foydalanuvchi mavjudligini va bloklanganligi tekshiramiz
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);
        boolean isPrivileged = user != null && user.getRole() != null &&
                ("OWNER".equals(user.getRole().getName()) || "ADMIN".equals(user.getRole().getName()));

        if (!isPrivileged && user != null && user.isLocked()) {
            long minutesLeft = ChronoUnit.MINUTES.between(LocalDateTime.now(), user.getLockedUntil()) + 1;
            saveAuthLog("LOCKED", request.getUsername(), ip, httpRequest);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "message", "Hisob bloklangan. " + minutesLeft + " daqiqadan so'ng urinib ko'ring.",
                            "locked", true,
                            "minutesLeft", minutesLeft
                    ));
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException | DisabledException e) {
            // Noto'g'ri parol — urinishlar sonini oshirish (OWNER/ADMIN uchun emas)
            if (user != null && !isPrivileged) {
                int attempts = user.getFailedAttempts() + 1;
                user.setFailedAttempts(attempts);
                if (attempts >= MAX_ATTEMPTS) {
                    user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_MINUTES));
                    userRepository.save(user);
                    saveAuthLog("LOCKED", request.getUsername(), ip, httpRequest);
                    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                            .body(Map.of(
                                    "message", "Ko'p marta noto'g'ri parol. Hisob " + LOCK_MINUTES + " daqiqaga bloklandi.",
                                    "locked", true,
                                    "minutesLeft", (long) LOCK_MINUTES
                            ));
                }
                userRepository.save(user);
                int remaining = MAX_ATTEMPTS - attempts;
                saveAuthLog("LOGIN_FAIL", request.getUsername(), ip, httpRequest);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message", "Parol noto'g'ri. Yana " + remaining + " ta urinish qoldi.",
                                "remainingAttempts", remaining
                        ));
            }
            saveAuthLog("LOGIN_FAIL", request.getUsername(), ip, httpRequest);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Login yoki parol noto'g'ri"));
        }

        // Muvaffaqiyatli kirish — hisoblagichni tozalash
        user = userRepository.findByUsername(request.getUsername()).orElseThrow();
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        saveAuthLog("LOGIN", request.getUsername(), ip, httpRequest);

        String device = parseDevice(httpRequest.getHeader("User-Agent"));
        userSessionService.createSession(user.getId(), user.getUsername(), ip, device);

        String accessToken   = jwtUtil.generateToken(user.getUsername(), user.getRole().getName());
        RefreshToken refresh = refreshTokenService.create(user);

        return ResponseEntity.ok(new LoginResponse(
                accessToken,
                refresh.getToken(),
                user.getUsername(),
                user.getRole().getName(),
                user.getFullName()
        ));
    }

    private void saveAuthLog(String action, String username, String ip, HttpServletRequest req) {
        try {
            String ua = req.getHeader("User-Agent");
            auditLogRepository.save(AuditLog.builder()
                    .action(action)
                    .username(username)
                    .entityType("Auth")
                    .ipAddress(ip)
                    .userAgent(ua)
                    .requestUri(req.getRequestURI())
                    .build());

            String device = parseDevice(ua);
            String time   = java.time.LocalTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));

            String msg = switch (action) {
                case "LOGIN" -> String.format(
                        "✅ <b>Tizimga kirdi</b>\n\n" +
                        "👤 Foydalanuvchi: <code>%s</code>\n" +
                        "🌐 IP: <code>%s</code>\n" +
                        "📱 Qurilma: %s\n" +
                        "🕐 Vaqt: %s",
                        username, ip, device, time);
                case "LOGIN_FAIL" -> String.format(
                        "⚠️ <b>Noto'g'ri parol!</b>\n\n" +
                        "👤 Foydalanuvchi: <code>%s</code>\n" +
                        "🌐 IP: <code>%s</code>\n" +
                        "📱 Qurilma: %s\n" +
                        "🕐 Vaqt: %s",
                        username, ip, device, time);
                case "LOCKED" -> String.format(
                        "🔒 <b>Hisob bloklandi!</b>\n\n" +
                        "👤 Foydalanuvchi: <code>%s</code>\n" +
                        "🌐 IP: <code>%s</code>\n" +
                        "📱 Qurilma: %s\n" +
                        "🕐 Vaqt: %s\n" +
                        "⏱ %d daqiqaga bloklandi",
                        username, ip, device, time, LOCK_MINUTES);
                default -> null;
            };
            if (msg != null) telegramService.sendToAll(msg);
        } catch (Exception ignored) {}
    }

    private String parseDevice(String ua) {
        if (ua == null || ua.isBlank()) return "Noma'lum";
        String u = ua.toLowerCase();
        String browser;
        if      (u.contains("edg"))                           browser = "Edge";
        else if (u.contains("chrome") && !u.contains("edg")) browser = "Chrome";
        else if (u.contains("firefox"))                       browser = "Firefox";
        else if (u.contains("safari") && !u.contains("chrome")) browser = "Safari";
        else                                                  browser = "Noma'lum";
        String os;
        if      (u.contains("android"))                       os = "Android";
        else if (u.contains("iphone") || u.contains("ipad")) os = "iOS";
        else if (u.contains("windows"))                       os = "Windows";
        else if (u.contains("mac"))                           os = "macOS";
        else if (u.contains("linux"))                         os = "Linux";
        else                                                  os = "Noma'lum";
        return browser + " / " + os;
    }

    private String getClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    @PostMapping("/refresh")
    @Operation(summary = "Access tokenni yangilash (rotation)")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refreshTokenStr = body.get("refreshToken");
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "refreshToken majburiy"));
        }

        return refreshTokenService.validate(refreshTokenStr)
                .map(rt -> {
                    User user = rt.getUser();
                    // Rotation: eski tokenni bekor qilish
                    refreshTokenService.revoke(refreshTokenStr);
                    // Yangi tokenlar berish
                    String newAccessToken   = jwtUtil.generateToken(user.getUsername(), user.getRole().getName());
                    RefreshToken newRefresh = refreshTokenService.create(user);
                    return ResponseEntity.ok(Map.of(
                            "token",        newAccessToken,
                            "refreshToken", newRefresh.getToken()
                    ));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Refresh token yaroqsiz yoki muddati o'tgan")));
    }

    @PostMapping("/logout")
    @Operation(summary = "Tizimdan chiqish")
    public ResponseEntity<Void> logout(HttpServletRequest request,
                                       @RequestBody(required = false) Map<String, String> body) {
        // Access tokenni blacklist ga qo'shish
        String header = request.getHeader("Authorization");
        String username = null;
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try { username = jwtUtil.getUsername(token); } catch (Exception ignored) {}
            jwtUtil.invalidate(token);
        }
        // Refresh tokenni bekor qilish
        if (body != null && body.containsKey("refreshToken")) {
            refreshTokenService.revoke(body.get("refreshToken"));
        }
        // Sessiyani yopish
        if (username != null) {
            userSessionService.closeSession(username, "MANUAL");
        }
        return ResponseEntity.noContent().build();
    }
}