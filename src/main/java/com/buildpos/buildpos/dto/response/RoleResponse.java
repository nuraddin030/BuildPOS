package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RoleResponse {
    private Long id;
    private String name;
    private LocalDateTime createdAt;
}
