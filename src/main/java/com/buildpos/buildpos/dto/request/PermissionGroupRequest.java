package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.PermissionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

// ─────────────────────────────────────────────
// Permission Group yaratish
// ─────────────────────────────────────────────
@Data
public class PermissionGroupRequest {

    @NotBlank
    private String name;        // PRODUCTS

    @NotBlank
    private String labelUz;     // Mahsulotlar

    @NotBlank
    private String labelEn;     // Products

    private Integer sortOrder = 0;
}
