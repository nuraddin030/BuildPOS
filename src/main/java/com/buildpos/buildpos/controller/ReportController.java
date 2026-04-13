package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.ProfitLossResponse;
import com.buildpos.buildpos.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "P&L hisobotlar")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/pl")
    @Operation(summary = "Foyda va zarar hisoboti")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('REPORTS_VIEW')")
    public ProfitLossResponse getProfitLoss(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getProfitLoss(from, to);
    }
}