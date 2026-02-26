package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.CategoryStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class CategoryResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String imageUrl;
    private CategoryStatus status;
    private Integer position;

    // Parent info
    private Long parentId;
    private String parentName;

    // Children (tree uchun)
    private List<CategoryResponse> children;

    // Breadcrumb (navigatsiya uchun)
    private List<BreadcrumbItem> breadcrumb;

    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}