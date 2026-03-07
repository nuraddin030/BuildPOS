package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.SaleRequest;
import com.buildpos.buildpos.dto.response.SaleResponse;
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

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
@Tag(name = "Sales", description = "Sotuv va savatcha boshqaruvi")
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER') or hasAuthority('SALES_CREATE')")
    @Operation(summary = "Yangi savatcha yaratish (DRAFT)")
    public ResponseEntity<SaleResponse> createDraft(@Valid @RequestBody SaleRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saleService.createDraft(request, username));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_CREATE')")
    @Operation(summary = "Savatchani yakunlash — kassir tasdiqlaydi, stock kamayadi")
    public ResponseEntity<SaleResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody List<SaleRequest.SalePaymentRequest> payments) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(saleService.complete(id, payments, username));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_CANCEL')")
    @Operation(summary = "Savatchani bekor qilish (faqat DRAFT)")
    public ResponseEntity<SaleResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(saleService.cancel(id));
    }

    @GetMapping("/draft")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Barcha ochiq savatchalar (kassir uchun)")
    public ResponseEntity<Page<SaleResponse>> getDraftSales(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(saleService.getDraftSales(pageable));
    }

    @GetMapping("/my-drafts")
    @PreAuthorize("hasAnyRole('SELLER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "O'z savatchalarim (sotuvchi uchun)")
    public ResponseEntity<Page<SaleResponse>> getMyDrafts(
            @PageableDefault(size = 20) Pageable pageable) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(saleService.getMyDraftSales(username, pageable));
    }

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

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Sotuv ID bo'yicha")
    public ResponseEntity<SaleResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(saleService.getById(id));
    }
}