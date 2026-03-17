package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.entity.WarehouseStock;
import com.buildpos.buildpos.repository.WarehouseStockRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/warehouse-stocks")
@RequiredArgsConstructor
@Tag(name = "Warehouse Stock", description = "Ombor zaxirasi")
public class WarehouseStockController {

    private final WarehouseStockRepository warehouseStockRepository;

    // ── Min stock yangilash ───────────────────────────────────────
    @PatchMapping("/{warehouseId}/product-units/{productUnitId}/min-stock")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('PRODUCTS_EDIT')")
    @Operation(summary = "Minimal zaxira miqdorini yangilash")
    public ResponseEntity<Void> updateMinStock(
            @PathVariable Long warehouseId,
            @PathVariable Long productUnitId,
            @RequestBody Map<String, Object> body) {

        warehouseStockRepository
                .findByWarehouseIdAndProductUnitId(warehouseId, productUnitId)
                .ifPresent(ws -> {
                    Object val = body.get("minStock");
                    if (val != null) {
                        ws.setMinStock(new BigDecimal(val.toString()));
                        warehouseStockRepository.save(ws);
                    }
                });

        return ResponseEntity.ok().build();
    }
}
