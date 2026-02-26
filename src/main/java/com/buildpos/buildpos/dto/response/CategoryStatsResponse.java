package com.buildpos.buildpos.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CategoryStatsResponse {
    private Long total;
    private Long active;
    private Long rootCount;
}
