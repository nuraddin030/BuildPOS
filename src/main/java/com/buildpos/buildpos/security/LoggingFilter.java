package com.buildpos.buildpos.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * B-17 — Request Logging
 * Har bir so'rov uchun: IP, method, path, status, response time
 * logback-spring.xml orqali kunlik fayllarga yoziladi
 */
@Component
@Order(1)
public class LoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("ACCESS");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, response);
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            String ip     = getClientIp(request);
            String method = request.getMethod();
            String uri    = request.getRequestURI();
            int    status = response.getStatus();

            // /actuator/health va favicon.ico loglarga tushmasin
            if (!uri.contains("actuator") && !uri.contains("favicon")) {
                log.info("{} {} {} {} {}ms", ip, method, uri, status, elapsed);
            }
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
