package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.ReturnRequest;
import com.buildpos.buildpos.dto.request.SaleRequest;
import com.buildpos.buildpos.dto.response.SaleResponse;
import com.buildpos.buildpos.dto.response.TodayStatsResponse;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import com.buildpos.buildpos.service.SaleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
@Tag(name = "Sales", description = "Sotuv va savatcha boshqaruvi")
public class SaleController {

    private final SaleService saleService;

    // ── SAVATCHA YARATISH ────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER') or hasAuthority('SALES_CREATE')")
    @Operation(summary = "Yangi savatcha yaratish (DRAFT)")
    public ResponseEntity<SaleResponse> createDraft(@Valid @RequestBody SaleRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saleService.createDraft(request, username));
    }

    // ── YAKUNLASH ────────────────────────────────────────────────────
    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_CREATE')")
    @Operation(summary = "Savatchani yakunlash — kassir tasdiqlaydi, stock kamayadi")
    public ResponseEntity<SaleResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody List<SaleRequest.SalePaymentRequest> payments) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(saleService.complete(id, payments, username));
    }

    // ── BEKOR QILISH ─────────────────────────────────────────────────
    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_CANCEL')")
    @Operation(summary = "Savatchani bekor qilish (faqat DRAFT/HOLD)")
    public ResponseEntity<SaleResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(saleService.cancel(id));
    }

    // ── QAYTARISH ────────────────────────────────────────────────────
    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SALES_RETURN')")
    @Operation(summary = "Sotuvni qaytarish — stock qaytadi, status RETURNED bo'ladi")
    public ResponseEntity<SaleResponse> returnSale(
            @PathVariable Long id,
            @Valid @RequestBody ReturnRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(saleService.returnSale(id, request, username));
    }

    // ── HOLD / UNHOLD ────────────────────────────────────────────────
    @PatchMapping("/{id}/hold")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_CREATE')")
    @Operation(summary = "Savatchani kechiktirish (DRAFT → HOLD)")
    public ResponseEntity<SaleResponse> hold(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(saleService.holdSale(id, username));
    }

    @PatchMapping("/{id}/unhold")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_CREATE')")
    @Operation(summary = "Savatchani ochish (HOLD → DRAFT)")
    public ResponseEntity<SaleResponse> unhold(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(saleService.unholdSale(id, username));
    }

    // ── OMBOR TEKSHIRISH ────────────────────────────────────────────
    @PostMapping("/check-warehouses")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_CREATE')")
    @Operation(summary = "Cart itemlar uchun qaysi omborlarda stock borligini qaytaradi")
    public ResponseEntity<?> checkWarehouses(@RequestBody List<Long> productUnitIds) {
        return ResponseEntity.ok(saleService.checkWarehouses(productUnitIds));
    }

    // ── BUGUNGI STATISTIKA ───────────────────────────────────────────
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Statistika — sana oralig'i bo'yicha")
    public ResponseEntity<TodayStatsResponse> getStats(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        // from/to bo'sh bo'lsa — bugungi kun
        if (from == null) from = LocalDate.now().atStartOfDay();
        if (to == null)   to   = from.plusDays(1);
        return ResponseEntity.ok(saleService.getStats(from, to));
    }

    // ── OCHIQ SAVATCHALAR (DRAFT + HOLD) ────────────────────────────
    @GetMapping("/open")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Ochiq savatchalar — admin: hammasi, kassir: o'ziniki (DRAFT + HOLD)")
    public ResponseEntity<Page<SaleResponse>> getOpenSales(
            @PageableDefault(size = 50) Pageable pageable) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(saleService.getOpenSales(username, pageable));
    }

    // ── SOTUV TARIXI ─────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Sotuv tarixi (filter + pagination)")
    public ResponseEntity<Page<SaleResponse>> getHistory(
            @RequestParam(required = false) Long sellerId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) SaleStatus status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                saleService.getHistory(sellerId, customerId, status, from, to, pageable)
        );
    }

    // ── O'Z TARIXI (SOTUVCHI) ────────────────────────────────────────
    @GetMapping("/my-history")
    @PreAuthorize("hasAnyRole('SELLER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "O'z sotuv tarixi (sotuvchi uchun)")
    public ResponseEntity<Page<SaleResponse>> getMyHistory(
            @RequestParam(required = false) SaleStatus status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20) Pageable pageable) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(
                saleService.getMyHistory(username, status, from, to, pageable)
        );
    }

    // ── ID BO'YICHA ──────────────────────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Sotuv ID bo'yicha")
    public ResponseEntity<SaleResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(saleService.getById(id));
    }
}