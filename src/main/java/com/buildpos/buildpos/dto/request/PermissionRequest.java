package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.PermissionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PermissionRequest {

    @NotNull
    private Long groupId;

    @NotBlank
    private String name;        // PRODUCT_CREATE

    @NotNull
    private PermissionType type; // PAGE, ACTION

    @NotBlank
    private String labelUz;     // Mahsulot qo'shish

    @NotBlank
    private String labelEn;     // Create product

    private Integer sortOrder = 0;
}