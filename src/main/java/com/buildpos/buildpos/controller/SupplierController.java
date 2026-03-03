package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.SupplierRequest;
import com.buildpos.buildpos.dto.response.SupplierDebtResponse;
import com.buildpos.buildpos.dto.response.SupplierResponse;
import com.buildpos.buildpos.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@Tag(name = "Suppliers", description = "Yetkazuvchilar boshqaruvi")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Barcha faol yetkazuvchilar")
    public ResponseEntity<List<SupplierResponse>> getAll() {
        return ResponseEntity.ok(supplierService.getAll());
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Yetkazuvchini nom bo'yicha qidirish")
    public ResponseEntity<List<SupplierResponse>> search(@RequestParam String name) {
        return ResponseEntity.ok(supplierService.search(name));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Yetkazuvchini ID bo'yicha olish")
    public ResponseEntity<SupplierResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi yetkazuvchi qo'shish")
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yetkazuvchi ma'lumotlarini yangilash")
    public ResponseEntity<SupplierResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.ok(supplierService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yetkazuvchini o'chirish (soft delete)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/debts")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yetkazuvchining qarz tarixi")
    public ResponseEntity<List<SupplierDebtResponse>> getDebts(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getDebts(id));
    }

    @GetMapping("/{id}/total-debt")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yetkazuvchining jami qarzi")
    public ResponseEntity<?> getTotalDebt(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getTotalDebt(id));
    }
}