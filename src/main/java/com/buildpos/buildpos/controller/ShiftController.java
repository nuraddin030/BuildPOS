package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.CloseShiftRequest;
import com.buildpos.buildpos.dto.request.OpenShiftRequest;
import com.buildpos.buildpos.dto.response.ShiftResponse;
import com.buildpos.buildpos.service.ShiftService;
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
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
@Tag(name = "Shifts", description = "Kassir smenalari")
public class ShiftController {

    private final ShiftService shiftService;

    @PostMapping("/open")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_SHIFT_OPEN')")
    @Operation(summary = "Smena ochish")
    public ResponseEntity<ShiftResponse> openShift(@Valid @RequestBody OpenShiftRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftService.openShift(request, username));
    }

    @PostMapping("/close")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_SHIFT_CLOSE')")
    @Operation(summary = "Smena yopish")
    public ResponseEntity<ShiftResponse> closeShift(@Valid @RequestBody CloseShiftRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(shiftService.closeShift(request, username));
    }

    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Joriy ochiq smena")
    public ResponseEntity<ShiftResponse> getCurrentShift() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(shiftService.getCurrentShift(username));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "Barcha smenalar tarixi")
    public ResponseEntity<Page<ShiftResponse>> getAll(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(shiftService.getAll(pageable));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'CASHIER') or hasAuthority('SALES_VIEW')")
    @Operation(summary = "O'z smenalarim tarixi")
    public ResponseEntity<Page<ShiftResponse>> getMyShifts(@PageableDefault(size = 20) Pageable pageable) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(shiftService.getMyCashierShifts(username, pageable));
    }
}