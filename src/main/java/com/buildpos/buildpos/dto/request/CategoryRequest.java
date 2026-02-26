package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.CategoryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
public class CategoryRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private String imageUrl;

    private Long parentId;

    private CategoryStatus status;

    private Integer position;
}