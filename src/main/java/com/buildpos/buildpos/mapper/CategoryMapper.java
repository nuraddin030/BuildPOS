package com.buildpos.buildpos.mapper;

import com.buildpos.buildpos.dto.response.BreadcrumbItem;
import com.buildpos.buildpos.dto.response.CategoryResponse;
import com.buildpos.buildpos.entity.Category;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class CategoryMapper {

    // To'liq response (children + breadcrumb bilan)
    public CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .imageUrl(category.getImageUrl())
                .status(category.getStatus())
                .position(category.getPosition())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .children(category.getChildren().stream()
                        .filter(c -> !c.getIsDeleted())
                        .map(this::toSimpleResponse)
                        .toList())
                .breadcrumb(buildBreadcrumb(category))
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    // Oddiy response (children va breadcrumb siz — list uchun)
    public CategoryResponse toSimpleResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .imageUrl(category.getImageUrl())
                .status(category.getStatus())
                .position(category.getPosition())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    // Breadcrumb qurish (Home > Oziq-ovqat > Ichimliklar)
    public List<BreadcrumbItem> buildBreadcrumb(Category category) {
        List<BreadcrumbItem> breadcrumb = new ArrayList<>();
        Category current = category;

        while (current != null) {
            breadcrumb.add(0, BreadcrumbItem.builder()
                    .id(current.getId())
                    .name(current.getName())
                    .slug(current.getSlug())
                    .build());
            current = current.getParent();
        }
        return breadcrumb;
    }
}
