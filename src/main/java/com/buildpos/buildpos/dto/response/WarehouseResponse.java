package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WarehouseResponse {

    private Long id;
    private String name;
    private String address;
    private Boolean isDefault;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private String createdBy;
}
