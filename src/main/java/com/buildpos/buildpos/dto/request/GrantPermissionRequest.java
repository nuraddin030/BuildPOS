package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GrantPermissionRequest {

    @NotNull(message = "Permission ID bo'sh bo'lmasligi kerak")
    private Long permissionId;
}
