package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.ProductStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// List va pagination uchun yengil response
@Data
@Builder
public class ProductSummaryResponse {

    private Long id;
    private String name;
    private String slug;
    private String sku;
    private String imageUrl;

    private Long categoryId;
    private String categoryName;

    private ProductStatus status;

    // Default unit ma'lumotlari
    private Long defaultUnitId;
    private String defaultUnit;
    private String defaultUnitSymbol;
    private String defaultBarcode;
    private BigDecimal defaultSalePrice;
    private BigDecimal defaultCostPrice;

    // Umumiy stock (barcha omborlar yig'indisi)
    private BigDecimal totalStock;
    private Boolean isLowStock;

    private LocalDateTime createdAt;
}
