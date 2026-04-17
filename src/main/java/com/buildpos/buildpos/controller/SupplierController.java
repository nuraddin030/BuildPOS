package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.SupplierRequest;
import com.buildpos.buildpos.dto.response.GroupedDebtResponse;
import com.buildpos.buildpos.dto.response.SupplierDebtResponse;
import com.buildpos.buildpos.dto.response.SupplierResponse;
import com.buildpos.buildpos.service.SupplierService;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@Tag(name = "Suppliers", description = "Yetkazuvchilar boshqaruvi")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_VIEW')")
    @Operation(summary = "Barcha faol yetkazuvchilar")
    public ResponseEntity<List<SupplierResponse>> getAll() {
        return ResponseEntity.ok(supplierService.getAll());
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_VIEW')")
    @Operation(summary = "Yetkazuvchini nom bo'yicha qidirish")
    public ResponseEntity<List<SupplierResponse>> search(@RequestParam String name) {
        return ResponseEntity.ok(supplierService.search(name));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_VIEW')")
    @Operation(summary = "Yetkazuvchini ID bo'yicha olish")
    public ResponseEntity<SupplierResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_CREATE')")
    @Operation(summary = "Yangi yetkazuvchi qo'shish")
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_EDIT')")
    @Operation(summary = "Yetkazuvchi ma'lumotlarini yangilash")
    public ResponseEntity<SupplierResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.ok(supplierService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_DELETE')")
    @Operation(summary = "Yetkazuvchini o'chirish (soft delete)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/debts")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_VIEW')")
    @Operation(summary = "Yetkazuvchining qarz tarixi")
    public ResponseEntity<List<SupplierDebtResponse>> getDebts(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getDebts(id));
    }

    @GetMapping("/{id}/total-debt")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('SUPPLIERS_VIEW')")
    @Operation(summary = "Yetkazuvchining jami qarzi")
    public ResponseEntity<?> getTotalDebt(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getTotalDebt(id));
    }

    // ── NasiyalarPage uchun ──────────────────────────────────────

    @GetMapping("/debts")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Barcha yetkazuvchi qarzlari (filter + pagination)")
    public ResponseEntity<Page<SupplierDebtResponse>> getAllDebts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isPaid,
            @RequestParam(required = false) Boolean isOverdue,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                supplierService.getAllDebts(search, isPaid, isOverdue, from, to, pageable));
    }

    @GetMapping("/debts/stats")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Yetkazuvchi qarzlari statistikasi")
    public ResponseEntity<Map<String, Object>> getDebtStats() {
        return ResponseEntity.ok(supplierService.getDebtStats());
    }

    @GetMapping("/debts/grouped")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_DEBT_VIEW')")
    @Operation(summary = "Ochiq qarzlar — yetkazuvchi bo'yicha guruhlangan (tree view uchun)")
    public ResponseEntity<List<GroupedDebtResponse>> getGroupedDebts(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(supplierService.getGroupedDebts(search));
    }

    @PatchMapping("/debts/{id}/set-due-date")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SUPPLIERS_MANAGE')")
    @Operation(summary = "Yetkazuvchi qarziga muddat belgilash")
    public ResponseEntity<SupplierDebtResponse> setDueDate(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(supplierService.setDebtDueDate(id, dueDate, notes));
    }
}