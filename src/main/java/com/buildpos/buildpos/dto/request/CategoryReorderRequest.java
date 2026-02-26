package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryReorderRequest {

    @NotNull(message = "Category ID is required")
    private Long id;

    @NotNull(message = "Position is required")
    private Integer position;
}