package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.WarehouseRequest;
import com.buildpos.buildpos.dto.response.WarehouseResponse;
import com.buildpos.buildpos.service.WarehouseService;
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
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
@Tag(name = "Warehouses", description = "Omborxonalar boshqaruvi")
public class WarehouseController {

    private final WarehouseService warehouseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi ombor yaratish")
    public ResponseEntity<WarehouseResponse> create(@Valid @RequestBody WarehouseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(warehouseService.create(request));
    }

    @GetMapping
    @Operation(summary = "Faol omborlar ro'yxati")
    public ResponseEntity<List<WarehouseResponse>> getAllActive() {
        return ResponseEntity.ok(warehouseService.getAllActive());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Barcha omborlar (inactive ham)")
    public ResponseEntity<List<WarehouseResponse>> getAll() {
        return ResponseEntity.ok(warehouseService.getAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "ID bo'yicha ombor")
    public ResponseEntity<WarehouseResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(warehouseService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Ombor ma'lumotlarini yangilash")
    public ResponseEntity<WarehouseResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody WarehouseRequest request) {
        return ResponseEntity.ok(warehouseService.update(id, request));
    }

    @PatchMapping("/{id}/set-default")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Ombor'ni default qilish")
    public ResponseEntity<WarehouseResponse> setDefault(@PathVariable Long id) {
        return ResponseEntity.ok(warehouseService.setDefault(id));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Statusni o'zgartirish (active/inactive)")
    public ResponseEntity<WarehouseResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(warehouseService.toggleStatus(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Ombor'ni o'chirish (ichida mahsulot bo'lmasa)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        warehouseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
