package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.PermissionGroupRequest;
import com.buildpos.buildpos.dto.request.PermissionRequest;
import com.buildpos.buildpos.dto.response.PermissionGroupResponse;
import com.buildpos.buildpos.dto.response.PermissionResponse;
import com.buildpos.buildpos.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
@Tag(name = "Permissions", description = "Ruxsatlar va guruhlar boshqaruvi")
public class PermissionController {

    private final PermissionService permissionService;

    // ─────────────────────────────────────────
    // GURUHLAR
    // ─────────────────────────────────────────
    @PostMapping("/groups")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi permission guruhi yaratish")
    public ResponseEntity<PermissionGroupResponse> createGroup(
            @Valid @RequestBody PermissionGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(permissionService.createGroup(request));
    }

    @GetMapping("/groups")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Barcha guruhlar (permissionlar bilan)")
    public ResponseEntity<List<PermissionGroupResponse>> getAllGroups() {
        return ResponseEntity.ok(permissionService.getAllGroups());
    }

    @DeleteMapping("/groups/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Guruhni o'chirish")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        permissionService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────
    // PERMISSIONLAR
    // ─────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi permission yaratish")
    public ResponseEntity<PermissionResponse> createPermission(
            @Valid @RequestBody PermissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(permissionService.createPermission(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Barcha permissionlar ro'yxati")
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @GetMapping("/groups/{groupId}/permissions")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Guruh bo'yicha permissionlar")
    public ResponseEntity<List<PermissionResponse>> getByGroup(@PathVariable Long groupId) {
        return ResponseEntity.ok(permissionService.getByGroup(groupId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Permissionni o'chirish")
    public ResponseEntity<Void> deletePermission(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.noContent().build();
    }
}