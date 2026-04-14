package com.buildpos.buildpos.security;

import com.buildpos.buildpos.entity.AuditLog;
import com.buildpos.buildpos.repository.AuditLogRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * B-11 — Audit Log Filter
 * POST/PUT/PATCH/DELETE so'rovlarini avtomatik qayd etadi.
 * Faqat autentifikatsiya qilingan foydalanuvchilar uchun ishlaydi.
 */
@Component
@RequiredArgsConstructor
public class AuditLogFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AuditLogFilter.class);

    private static final Set<String> LOGGED_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    // URL dan entity turini aniqlash: /api/v1/products/123 → Product
    private static final Pattern ID_PATTERN = Pattern.compile("/(\\d+)");

    private final AuditLogRepository auditLogRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        chain.doFilter(request, response);

        // Javob yuborilgandan keyin log yoziladi
        String method = request.getMethod();
        if (!LOGGED_METHODS.contains(method)) return;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return;

        try {
            String uri        = request.getRequestURI();
            String action     = resolveAction(method);
            String entityType = resolveEntityType(uri);
            Long   entityId   = resolveEntityId(uri);
            String ip         = getClientIp(request);
            String username   = resolveUsername(auth);

            AuditLog entry = AuditLog.builder()
                    .username(username)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .ipAddress(ip)
                    .userAgent(request.getHeader("User-Agent"))
                    .requestUri(uri)
                    .build();

            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Audit log yozishda xato: {}", ex.getMessage());
        }
    }

    private String resolveAction(String method) {
        return switch (method) {
            case "POST"   -> "CREATE";
            case "PUT",
                 "PATCH"  -> "UPDATE";
            case "DELETE" -> "DELETE";
            default       -> method;
        };
    }

    /**
     * /api/v1/products/123  → Product
     * /api/v1/sales         → Sale
     * /api/auth/login       → Auth
     */
    private String resolveEntityType(String uri) {
        // Remove leading /api/v1/ or /api/
        String path = uri.replaceFirst("^/api(/v\\d+)?/", "");
        // First segment = entity name
        String segment = path.split("/")[0];
        return switch (segment) {
            case "products"    -> "Product";
            case "sales"       -> "Sale";
            case "purchases"   -> "Purchase";
            case "customers"   -> "Customer";
            case "suppliers"   -> "Supplier";
            case "employees"   -> "Employee";
            case "partners"    -> "Partner";
            case "categories"  -> "Category";
            case "units"       -> "Unit";
            case "warehouses"  -> "Warehouse";
            case "shifts"      -> "Shift";
            case "inventory"   -> "Inventory";
            case "auth"        -> "Auth";
            default            -> capitalize(segment);
        };
    }

    private Long resolveEntityId(String uri) {
        Matcher m = ID_PATTERN.matcher(uri);
        Long last = null;
        while (m.find()) {
            try { last = Long.parseLong(m.group(1)); } catch (NumberFormatException ignored) {}
        }
        return last;
    }

    private String resolveUsername(Authentication auth) {
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) return ud.getUsername();
        return principal.toString();
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}