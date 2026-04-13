package com.buildpos.buildpos.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * B-04 — Rate Limiting
 * Login: 5 urinish / 15 daqiqa (IP bo'yicha)
 * 429 Too Many Requests + Retry-After header
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int  MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS    = 15 * 60 * 1000L; // 15 daqiqa

    // IP → [urinishlar soni, oyna boshlanish vaqti]
    private final ConcurrentHashMap<String, long[]> attempts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        if ("/api/auth/login".equals(request.getServletPath())
                && "POST".equalsIgnoreCase(request.getMethod())) {

            String ip  = getClientIp(request);
            long   now = System.currentTimeMillis();

            long[] window = attempts.compute(ip, (k, v) -> {
                // Yangi oyna yoki eski oyna tugagan
                if (v == null || now - v[1] > WINDOW_MS) {
                    return new long[]{1, now};
                }
                return new long[]{v[0] + 1, v[1]};
            });

            if (window[0] > MAX_ATTEMPTS) {
                long retryAfterSec = (WINDOW_MS - (now - window[1])) / 1000;
                response.setStatus(429);
                response.setHeader("Retry-After", String.valueOf(Math.max(retryAfterSec, 1)));
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                    "{\"message\":\"Juda ko\\u02bfp urinish. " +
                    (retryAfterSec / 60 + 1) + " daqiqadan so\\u02bfng qayta urinib ko\\u02bfring.\"}"
                );
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        // Nginx / proxy ortida bo'lsa X-Forwarded-For ishlatiladi
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}