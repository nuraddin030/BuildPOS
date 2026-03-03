package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.RoleResponse;
import com.buildpos.buildpos.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Roles", description = "Rollar ro'yxati")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Barcha rollar ro'yxati")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public List<RoleResponse> getAll() {
        return roleService.getAll();
    }
}
