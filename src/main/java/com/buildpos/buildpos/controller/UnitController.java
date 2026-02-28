package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.UnitRequest;
import com.buildpos.buildpos.dto.response.UnitResponse;
import com.buildpos.buildpos.service.UnitService;
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
@RequestMapping("/api/v1/units")
@RequiredArgsConstructor
@Tag(name = "Units", description = "O'lchov birliklari boshqaruvi")
public class UnitController {

    private final UnitService unitService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi o'lchov birligi yaratish")
    public ResponseEntity<UnitResponse> create(@Valid @RequestBody UnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(unitService.create(request));
    }

    @GetMapping
    @Operation(summary = "Faol o'lchov birliklari ro'yxati")
    public ResponseEntity<List<UnitResponse>> getAllActive() {
        return ResponseEntity.ok(unitService.getAllActive());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Barcha o'lchov birliklari (inactive ham)")
    public ResponseEntity<List<UnitResponse>> getAll() {
        return ResponseEntity.ok(unitService.getAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "ID bo'yicha olish")
    public ResponseEntity<UnitResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(unitService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "O'lchov birligini yangilash")
    public ResponseEntity<UnitResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UnitRequest request) {
        return ResponseEntity.ok(unitService.update(id, request));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Statusni o'zgartirish (active/inactive)")
    public ResponseEntity<UnitResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(unitService.toggleStatus(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "O'lchov birligini o'chirish (mahsulotda ishlatilmasa)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        unitService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
