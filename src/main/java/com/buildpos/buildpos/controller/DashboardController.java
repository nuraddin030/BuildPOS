package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.DashboardResponse;
import com.buildpos.buildpos.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Bosh sahifa statistikasi")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Dashboard statistikasi")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN') or hasAuthority('DASHBOARD_VIEW')")
    public DashboardResponse getDashboard() {
        return dashboardService.getDashboard();
    }
}
