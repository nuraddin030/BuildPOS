package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.CustomerDebtPaymentRequest;
import com.buildpos.buildpos.dto.request.CustomerRequest;
import com.buildpos.buildpos.dto.response.CustomerDebtResponse;
import com.buildpos.buildpos.dto.response.CustomerResponse;
import java.util.List;
import com.buildpos.buildpos.service.CustomerService;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Mijozlar boshqaruvi")
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER')")
    @Operation(summary = "Yangi mijoz qo'shish")
    public ResponseEntity<CustomerResponse> create(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER')")
    @Operation(summary = "Mijozlar ro'yxati (ism yoki telefon bo'yicha qidirish)")
    public ResponseEntity<Page<CustomerResponse>> getAll(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(customerService.getAll(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER')")
    @Operation(summary = "Mijozni ID bo'yicha olish")
    public ResponseEntity<CustomerResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getById(id));
    }

    @GetMapping("/phone/{phone}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER', 'SELLER')")
    @Operation(summary = "Mijozni telefon bo'yicha qidirish")
    public ResponseEntity<CustomerResponse> getByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(customerService.getByPhone(phone));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Mijoz ma'lumotlarini yangilash")
    public ResponseEntity<CustomerResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(customerService.update(id, request));
    }

    @PostMapping("/debts/{debtId}/pay")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER')")
    @Operation(summary = "Nasiya to'lash")
    public ResponseEntity<CustomerResponse> payDebt(
            @PathVariable Long debtId,
            @Valid @RequestBody CustomerDebtPaymentRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(customerService.payDebt(debtId, request, username));
    }

    @GetMapping("/{id}/debts")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Mijozning qarz tarixi (barcha nasiyalar va to'lovlar)")
    public ResponseEntity<List<CustomerDebtResponse>> getDebts(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getDebts(id));
    }
}