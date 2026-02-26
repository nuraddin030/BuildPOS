package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BreadcrumbItem {
    private Long id;
    private String name;
    private String slug;
}