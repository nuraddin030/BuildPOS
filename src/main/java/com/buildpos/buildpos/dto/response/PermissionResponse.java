package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.PermissionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PermissionResponse {
    private Long id;
    private Long groupId;
    private String groupName;
    private String name;
    private PermissionType type;
    private String labelUz;
    private String labelEn;
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
