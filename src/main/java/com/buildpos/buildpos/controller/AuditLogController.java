package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.entity.AuditLog;
import com.buildpos.buildpos.repository.AuditLogRepository;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Tizim faoliyati jurnali")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Audit log ro'yxati (filter + pagination)")
    public Page<AuditLog> getAll(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "true") boolean excludeAuth,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        LocalDateTime dtFrom = from != null ? from.atStartOfDay() : null;
        LocalDateTime dtTo   = to   != null ? to.atTime(LocalTime.MAX) : null;

        return auditLogRepository.findFiltered(
                username, action, dtFrom, dtTo, excludeAuth,
                PageRequest.of(page, size)
        );
    }

    @GetMapping("/failed-attempts")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Muvaffaqiyatsiz login urinishlari (sessiyalar tab uchun)")
    public List<AuditLog> getFailedAttempts(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDateTime dtFrom = from != null ? from.atStartOfDay() : null;
        LocalDateTime dtTo   = to   != null ? to.atTime(LocalTime.MAX) : null;
        return auditLogRepository.findFailedAttempts(username, dtFrom, dtTo);
    }
}