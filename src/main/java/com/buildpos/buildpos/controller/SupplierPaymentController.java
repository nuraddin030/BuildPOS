package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.SupplierPaymentRequest;
import com.buildpos.buildpos.dto.response.SupplierDebtResponse;
import com.buildpos.buildpos.entity.SupplierPayment;
import com.buildpos.buildpos.service.SupplierPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/supplier-payments")
@RequiredArgsConstructor
@Tag(name = "Supplier Payments", description = "Yetkazuvchilarga to'lovlar")
public class SupplierPaymentController {

    private final SupplierPaymentService supplierPaymentService;

    @PostMapping("/pay-debt")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Yetkazuvchi qarzini to'lash (ko'p usulda + smena harajati)")
    public ResponseEntity<SupplierDebtResponse> payDebt(
            @RequestBody SupplierPaymentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(supplierPaymentService.payDebt(request, userDetails.getUsername()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Yetkazuvchiga qarz to'lash (eski)")
    public ResponseEntity<SupplierPayment> pay(@RequestBody SupplierPayment payment) {
        return ResponseEntity.ok(supplierPaymentService.pay(payment));
    }

    @GetMapping("/supplier/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Yetkazuvchiga qilingan to'lovlar tarixi")
    public ResponseEntity<List<SupplierPayment>> getPayments(@PathVariable Long id) {
        return ResponseEntity.ok(supplierPaymentService.getPayments(id));
    }

    @GetMapping("/summary/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Yetkazuvchi bo'yicha moliyaviy xulosa (jami qarz, to'langan, qoldiq)")
    public ResponseEntity<Map<String, Object>> getSummary(@PathVariable Long id) {
        return ResponseEntity.ok(supplierPaymentService.getSummary(id));
    }
}