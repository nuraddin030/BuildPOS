package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.EmployeeRequest;
import com.buildpos.buildpos.dto.request.GrantPermissionRequest;
import com.buildpos.buildpos.dto.response.EmployeeResponse;
import com.buildpos.buildpos.service.EmployeeService;
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
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employees", description = "Xodimlar va ruxsatlar boshqaruvi")
public class EmployeeController {

    private final EmployeeService employeeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi xodim qo'shish")
    public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Barcha xodimlar ro'yxati")
    public ResponseEntity<Page<EmployeeResponse>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(employeeService.getAll(pageable));
    }

    @GetMapping("/me")
    @Operation(summary = "O'z profili va permission ro'yxati (frontend uchun)")
    public ResponseEntity<EmployeeResponse> getMe() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(employeeService.getMe(username));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Xodimni ID bo'yicha olish (permission ro'yxati bilan)")
    public ResponseEntity<EmployeeResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Xodim ma'lumotlarini yangilash")
    public ResponseEntity<EmployeeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(employeeService.update(id, request));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Xodimni aktiv/noaktiv qilish")
    public ResponseEntity<EmployeeResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.toggleStatus(id));
    }

    @PostMapping("/{id}/permissions")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Xodimga permission berish")
    public ResponseEntity<EmployeeResponse> grantPermission(
            @PathVariable Long id,
            @Valid @RequestBody GrantPermissionRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(employeeService.grantPermission(id, request, username));
    }

    @DeleteMapping("/{id}/permissions/{permissionId}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Xodimdan permission olish")
    public ResponseEntity<EmployeeResponse> revokePermission(
            @PathVariable Long id,
            @PathVariable Long permissionId) {
        return ResponseEntity.ok(employeeService.revokePermission(id, permissionId));
    }
}
