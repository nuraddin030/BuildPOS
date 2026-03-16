package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.StockMovementResponse;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.service.StockMovementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stock-movements")
@RequiredArgsConstructor
@Tag(name = "Stock Movements", description = "Stock kirim/chiqim tarixi")
public class StockMovementController {

    private final StockMovementService stockMovementService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('STOCK_VIEW')")
    @Operation(summary = "Stock harakatlari tarixi (filter + pagination)")
    public ResponseEntity<Page<StockMovementResponse>> getAll(
            @RequestParam(required = false) Long productUnitId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) StockMovementType movementType,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20, sort = "moved_at", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(
                stockMovementService.getAll(productUnitId, warehouseId, movementType, from, to, productName, pageable)
        );
    }

    @GetMapping("/counts")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('STOCK_VIEW')")
    @Operation(summary = "Har bir harakat turi bo'yicha jami son")
    public ResponseEntity<Map<String, Long>> getCounts() {
        return ResponseEntity.ok(stockMovementService.getCounts());
    }
}