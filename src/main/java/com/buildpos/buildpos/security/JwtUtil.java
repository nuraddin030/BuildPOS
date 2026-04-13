package com.buildpos.buildpos.security;

import com.buildpos.buildpos.service.TokenBlacklistService;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    @Lazy
    @Autowired
    private TokenBlacklistService blacklistService;

    private Key getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String username, String role) {
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getKey())
                .compact();
    }

    public String getUsername(String token) {
        return getClaims(token).getSubject();
    }

    public String getRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    /** Token muddati tugashini LocalDateTime sifatida qaytaradi */
    public LocalDateTime getExpiresAt(String token) {
        Date exp = getClaims(token).getExpiration();
        return Instant.ofEpochMilli(exp.getTime())
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
    }

    /** Token tekshirish — DB blacklist orqali */
    public boolean isValid(String token) {
        try {
            getClaims(token); // signature + expiry tekshirish
            return !blacklistService.contains(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** Tokenni blacklist ga qo'shish (logout) — DB ga yoziladi */
    public void invalidate(String token) {
        try {
            LocalDateTime expiresAt = getExpiresAt(token);
            blacklistService.add(token, expiresAt);
        } catch (JwtException | IllegalArgumentException ignored) {
            // Yaroqsiz token — blacklist ga qo'shishning hojati yo'q
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
