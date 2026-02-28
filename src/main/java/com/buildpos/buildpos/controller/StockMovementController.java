package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.StockMovementResponse;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.service.StockMovementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/stock-movements")
@RequiredArgsConstructor
@Tag(name = "Stock Movements", description = "Stock kirim/chiqim tarixi")
public class StockMovementController {

    private final StockMovementService stockMovementService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER')")
    @Operation(summary = "Stock harakatlari tarixi (filter + pagination)",
            description = """
                   Filterlar (hammasi ixtiyoriy):
                   - productUnitId — mahsulot unit ID
                   - warehouseId   — ombor ID (from yoki to)
                   - movementType  — PURCHASE_IN, SALE_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER_IN, TRANSFER_OUT, RETURN_IN
                   - from          — boshlanish sana (yyyy-MM-dd'T'HH:mm:ss)
                   - to            — tugash sana (yyyy-MM-dd'T'HH:mm:ss)
               """)
    public ResponseEntity<Page<StockMovementResponse>> getAll(
            @RequestParam(required = false) Long productUnitId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) StockMovementType movementType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(
                stockMovementService.getAll(productUnitId, warehouseId, movementType, from, to, pageable)
        );
    }
}