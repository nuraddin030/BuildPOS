package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.PermissionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

// ─────────────────────────────────────────────
// PermissionGroupResponse
// ─────────────────────────────────────────────
@Data
@Builder
public class PermissionGroupResponse {
    private Long id;
    private String name;
    private String labelUz;
    private String labelEn;
    private Integer sortOrder;
    private List<PermissionResponse> permissions;
}
