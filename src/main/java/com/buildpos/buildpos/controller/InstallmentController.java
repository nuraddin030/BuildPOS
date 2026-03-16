package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.InstallmentResponse;
import com.buildpos.buildpos.service.InstallmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customers/debts/{debtId}/installments")
@RequiredArgsConstructor
@Tag(name = "Installments", description = "Nasiya to'lov jadvali")
public class InstallmentController {

    private final InstallmentService installmentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('CUSTOMERS_DEBT_VIEW')")
    @Operation(summary = "Qarz uchun to'lov jadvalini olish")
    public ResponseEntity<List<InstallmentResponse>> getByDebt(@PathVariable Long debtId) {
        return ResponseEntity.ok(installmentService.getByDebt(debtId));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('CUSTOMERS_DEBT_PAY')")
    @Operation(summary = "Avtomatik jadval yaratish (teng taqsimlash)")
    public ResponseEntity<List<InstallmentResponse>> generate(
            @PathVariable Long debtId,
            @RequestParam int months,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        return ResponseEntity.ok(installmentService.generate(debtId, months, startDate));
    }

    @PostMapping("/custom")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('CUSTOMERS_DEBT_PAY')")
    @Operation(summary = "Qo'lda jadval saqlash")
    public ResponseEntity<List<InstallmentResponse>> saveCustom(
            @PathVariable Long debtId,
            @RequestBody List<Map<String, Object>> items) {
        return ResponseEntity.ok(installmentService.saveCustom(debtId, items));
    }

    @PostMapping("/{installmentId}/pay")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('CUSTOMERS_DEBT_PAY')")
    @Operation(summary = "Installmentni to'lash")
    public ResponseEntity<InstallmentResponse> pay(
            @PathVariable Long debtId,
            @PathVariable Long installmentId,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(installmentService.pay(installmentId, amount, notes));
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('CUSTOMERS_DEBT_PAY')")
    @Operation(summary = "Jadvalni o'chirish")
    public ResponseEntity<Void> delete(@PathVariable Long debtId) {
        installmentService.delete(debtId);
        return ResponseEntity.noContent().build();
    }
}
