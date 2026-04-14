package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class EmployeeResponse {
    private Long id;
    private String fullName;
    private String username;
    private String phone;
    private String roleName;
    private Boolean isActive;
    private Boolean isLocked;
    private LocalDateTime lockedUntil;
    private LocalDateTime createdAt;
    private Long roleId;

    // Guruh bo'yicha permission ro'yxati
    private List<PermissionGroupResponse> permissionGroups;
}