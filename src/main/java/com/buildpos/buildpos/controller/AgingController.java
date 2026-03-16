package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.AgingResponse;
import com.buildpos.buildpos.service.AgingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/aging")
@RequiredArgsConstructor
@Tag(name = "Aging Report", description = "Qarz qarishi hisoboti")
public class AgingController {

    private final AgingService agingService;

    @GetMapping("/customers")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('CUSTOMERS_DEBT_VIEW')")
    @Operation(summary = "Mijozlar qarzi aging hisoboti")
    public ResponseEntity<AgingResponse> getCustomerAging() {
        return ResponseEntity.ok(agingService.getCustomerAging());
    }

    @GetMapping("/suppliers")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Yetkazuvchilar qarzi aging hisoboti")
    public ResponseEntity<AgingResponse> getSupplierAging() {
        return ResponseEntity.ok(agingService.getSupplierAging());
    }
}
