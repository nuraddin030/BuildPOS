package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.PurchasePaymentRequest;
import com.buildpos.buildpos.dto.request.PurchaseRequest;
import com.buildpos.buildpos.dto.request.ReceivePurchaseRequest;
import com.buildpos.buildpos.dto.response.PurchaseResponse;
import com.buildpos.buildpos.dto.response.PurchaseSummaryResponse;
import com.buildpos.buildpos.entity.enums.PurchaseStatus;
import com.buildpos.buildpos.service.PurchaseService;
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
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/purchases")
@RequiredArgsConstructor
@Tag(name = "Purchases", description = "Yetkazib beruvchidan tovar xaridi")
public class PurchaseController {

    private final PurchaseService purchaseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('PURCHASES_CREATE')")
    @Operation(summary = "Yangi xarid yaratish")
    public ResponseEntity<PurchaseResponse> create(@Valid @RequestBody PurchaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(purchaseService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('PURCHASES_VIEW')")
    @Operation(summary = "Xaridlar ro'yxati (filter + pagination)")
    public ResponseEntity<Page<PurchaseSummaryResponse>> getAll(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                purchaseService.getAll(supplierId, warehouseId, status, from, to, pageable)
        );
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('PURCHASES_VIEW')")
    @Operation(summary = "Xaridni ID bo'yicha olish")
    public ResponseEntity<PurchaseResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseService.getById(id));
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('PURCHASES_RECEIVE')")
    @Operation(summary = "Tovarni qabul qilish (stock ko'tariladi)")
    public ResponseEntity<PurchaseResponse> receive(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReceivePurchaseRequest request) {
        return ResponseEntity.ok(
                purchaseService.receive(id, request != null ? request : new ReceivePurchaseRequest())
        );
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('PURCHASES_PAY')")
    @Operation(summary = "Xaridga to'lov qo'shish")
    public ResponseEntity<PurchaseResponse> addPayment(
            @PathVariable Long id,
            @Valid @RequestBody PurchasePaymentRequest request) {
        return ResponseEntity.ok(purchaseService.addPayment(id, request));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('PURCHASES_DELETE')")
    @Operation(summary = "Xaridni bekor qilish (faqat PENDING holda)")
    public ResponseEntity<PurchaseResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseService.cancel(id));
    }
}
