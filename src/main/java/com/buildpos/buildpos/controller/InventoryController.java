package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.InventoryCreateRequest;
import com.buildpos.buildpos.dto.request.InventoryItemUpdateRequest;
import com.buildpos.buildpos.dto.response.InventorySessionResponse;
import com.buildpos.buildpos.service.InventoryService;
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
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory", description = "Inventarizatsiya moduli")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STOREKEEPER') or hasAuthority('INVENTORY_VIEW')")
    @Operation(summary = "Inventarizatsiya sessiyalari ro'yxati")
    public ResponseEntity<Page<InventorySessionResponse>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(inventoryService.getAll(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STOREKEEPER') or hasAuthority('INVENTORY_VIEW')")
    @Operation(summary = "Inventarizatsiya sessiyasini ko'rish (items bilan)")
    public ResponseEntity<InventorySessionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STOREKEEPER') or hasAuthority('INVENTORY_MANAGE')")
    @Operation(summary = "Yangi inventarizatsiya sessiyasi yaratish")
    public ResponseEntity<InventorySessionResponse> create(
            @Valid @RequestBody InventoryCreateRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.create(request, username));
    }

    @PatchMapping("/{sessionId}/items/{itemId}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STOREKEEPER') or hasAuthority('INVENTORY_MANAGE')")
    @Operation(summary = "Mahsulot haqiqiy miqdorini kiritish")
    public ResponseEntity<InventorySessionResponse> updateItem(
            @PathVariable Long sessionId,
            @PathVariable Long itemId,
            @RequestBody InventoryItemUpdateRequest request) {
        return ResponseEntity.ok(inventoryService.updateItem(sessionId, itemId, request));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN') or hasAuthority('INVENTORY_MANAGE')")
    @Operation(summary = "Inventarizatsiyani yakunlash (stock ajustment qo'llanadi)")
    public ResponseEntity<InventorySessionResponse> complete(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(inventoryService.complete(id, username));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN') or hasAuthority('INVENTORY_MANAGE')")
    @Operation(summary = "DRAFT sessiyani o'chirish")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inventoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}