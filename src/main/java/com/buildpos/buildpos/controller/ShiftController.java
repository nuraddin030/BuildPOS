package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.CloseShiftRequest;
import com.buildpos.buildpos.dto.request.OpenShiftRequest;
import com.buildpos.buildpos.dto.response.ShiftResponse;
import com.buildpos.buildpos.dto.response.ShiftSummaryResponse;
import com.buildpos.buildpos.service.ShiftService;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
@Tag(name = "Shifts", description = "Kassir smenalari")
public class ShiftController {

    private final ShiftService shiftService;

    // ── SMENA OCHISH ─────────────────────────────────────────────────
    @PostMapping("/open")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_SHIFT_OPEN')")
    @Operation(summary = "Smena ochish")
    public ResponseEntity<ShiftResponse> openShift(@Valid @RequestBody OpenShiftRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftService.openShift(request, username));
    }

    // ── SMENA YOPISH ─────────────────────────────────────────────────
    @PostMapping("/close")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_SHIFT_CLOSE')")
    @Operation(summary = "Smena yopish")
    public ResponseEntity<ShiftResponse> closeShift(@Valid @RequestBody CloseShiftRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(shiftService.closeShift(request, username));
    }

    // ── JORIY SMENA ──────────────────────────────────────────────────
    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Joriy ochiq smena")
    public ResponseEntity<ShiftResponse> getCurrentShift() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(shiftService.getCurrentShift(username));
    }

    // ── ID BO'YICHA ──────────────────────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Smena ID bo'yicha")
    public ResponseEntity<ShiftResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(shiftService.getById(id));
    }

    // ── SMENA HISOBOTI ───────────────────────────────────────────────
    @GetMapping("/{id}/summary")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SHIFT_VIEW')")
    @Operation(summary = "Smena hisoboti — sotuvlar breakdown, top mahsulotlar, kassa farqi")
    public ResponseEntity<ShiftSummaryResponse> getShiftSummary(@PathVariable Long id) {
        return ResponseEntity.ok(shiftService.getShiftSummary(id));
    }

    // ── BARCHA SMENALAR (FILTER) ─────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SHIFT_VIEW')")
    @Operation(summary = "Barcha smenalar tarixi (filter: kassir, sana oralig'i)")
    public ResponseEntity<Page<ShiftResponse>> getAll(
            @RequestParam(required = false) Long cashierId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(shiftService.getAllFiltered(cashierId, from, to, pageable));
    }

    // ── SANA BO'YICHA SMENALAR ───────────────────────────────────────
    @GetMapping("/by-date")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Berilgan sana bo'yicha smenalar ro'yxati")
    public ResponseEntity<List<ShiftResponse>> getByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(shiftService.getShiftsByDate(date));
    }

    // ── O'Z SMENALARIM ───────────────────────────────────────────────
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "O'z smenalarim tarixi")
    public ResponseEntity<Page<ShiftResponse>> getMyShifts(
            @PageableDefault(size = 20) Pageable pageable) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(shiftService.getMyCashierShifts(username, pageable));
    }
}