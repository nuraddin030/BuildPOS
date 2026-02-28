package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.ProductRequest;
import com.buildpos.buildpos.dto.request.StockAdjustmentRequest;
import com.buildpos.buildpos.dto.request.StockTransferRequest;
import com.buildpos.buildpos.dto.response.ProductResponse;
import com.buildpos.buildpos.dto.response.ProductSummaryResponse;
import com.buildpos.buildpos.entity.enums.ProductStatus;
import com.buildpos.buildpos.service.ProductService;
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
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Mahsulotlar boshqaruvi")
public class ProductController {

    private final ProductService productService;

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Yangi mahsulot yaratish")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request));
    }

    // ─────────────────────────────────────────
    // LIST (pagination + filter)
    // ─────────────────────────────────────────
    @GetMapping
    @Operation(summary = "Mahsulotlar ro'yxati (pagination, filter, search)")
    public ResponseEntity<Page<ProductSummaryResponse>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) ProductStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(productService.getAll(search, categoryId, status, pageable));
    }

    // ─────────────────────────────────────────
    // LOW STOCK
    // ─────────────────────────────────────────
    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Kam qolgan mahsulotlar")
    public ResponseEntity<Page<ProductSummaryResponse>> getLowStock(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(productService.getLowStockProducts(pageable));
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    @GetMapping("/{id}")
    @Operation(summary = "Mahsulotni ID bo'yicha olish")
    public ResponseEntity<ProductResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    // ─────────────────────────────────────────
    // GET BY BARCODE (POS skaner uchun)
    // ─────────────────────────────────────────
    @GetMapping("/barcode/{barcode}")
    @Operation(summary = "Barcode bo'yicha mahsulot topish (POS skaner)")
    public ResponseEntity<ProductResponse> getByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(productService.getByBarcode(barcode));
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Mahsulotni yangilash")
    public ResponseEntity<ProductResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    // ─────────────────────────────────────────
    // TOGGLE STATUS
    // ─────────────────────────────────────────
    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Mahsulot statusini o'zgartirish (ACTIVE/INACTIVE)")
    public ResponseEntity<ProductResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(productService.toggleStatus(id));
    }

    // ─────────────────────────────────────────
    // DELETE (soft)
    // ─────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Mahsulotni o'chirish (soft delete)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────
    // STOCK ADJUSTMENT (qo'lda kirim/chiqim)
    // ─────────────────────────────────────────
    @PostMapping("/stock/adjust")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Qo'lda stock kirim/chiqim (inventarizatsiya)")
    public ResponseEntity<Void> adjustStock(@Valid @RequestBody StockAdjustmentRequest request) {
        productService.adjustStock(request);
        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────
    // STOCK TRANSFER (omborlar orasida)
    // ─────────────────────────────────────────
    @PostMapping("/stock/transfer")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Omborlar orasida mahsulot ko'chirish")
    public ResponseEntity<Void> transferStock(@Valid @RequestBody StockTransferRequest request) {
        productService.transferStock(request);
        return ResponseEntity.ok().build();
    }
}