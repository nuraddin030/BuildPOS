package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.PartnerRequest;
import com.buildpos.buildpos.dto.response.PartnerResponse;
import com.buildpos.buildpos.service.PartnerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/partners")
@RequiredArgsConstructor
@Tag(name = "Partners", description = "Hamkorlar boshqaruvi")
public class PartnerController {

    private final PartnerService partnerService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi hamkor qo'shish")
    public ResponseEntity<PartnerResponse> create(@Valid @RequestBody PartnerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(partnerService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Hamkorlar ro'yxati (ism yoki telefon bo'yicha qidirish)")
    public ResponseEntity<Page<PartnerResponse>> getAll(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(partnerService.getAll(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Hamkorni ID bo'yicha olish (statistika bilan)")
    public ResponseEntity<PartnerResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(partnerService.getById(id));
    }

    @GetMapping("/phone/{phone}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER')")
    @Operation(summary = "Hamkorni telefon bo'yicha qidirish (savatcha uchun)")
    public ResponseEntity<PartnerResponse> getByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(partnerService.getByPhone(phone));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Hamkor ma'lumotlarini yangilash")
    public ResponseEntity<PartnerResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody PartnerRequest request) {
        return ResponseEntity.ok(partnerService.update(id, request));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Hamkorni aktiv/noaktiv qilish")
    public ResponseEntity<PartnerResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(partnerService.toggleStatus(id));
    }
}
