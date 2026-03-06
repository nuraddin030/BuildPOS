package com.buildpos.buildpos.dto.request;

import com.buildpos.buildpos.entity.enums.PriceTierType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

// ─────────────────────────────────────────────
// ProductRequest — yangi mahsulot yaratish
// ─────────────────────────────────────────────
@Data
public class ProductRequest {

    @NotBlank(message = "Mahsulot nomi bo'sh bo'lmasligi kerak")
    private String name;

    private String description;
    private String sku;
    private String imageUrl;
    private Long categoryId;

    @NotEmpty(message = "Kamida bitta o'lchov birligi bo'lishi kerak")
    @Valid
    private List<ProductUnitRequest> units;

    private List<Long> supplierIds;

    // ─────────────────────────────────────────
    // ProductUnitRequest — bitta unit uchun
    // ─────────────────────────────────────────
    @Data
    public static class ProductUnitRequest {

        @NotNull(message = "Unit ID bo'sh bo'lmasligi kerak")
        private Long unitId;

        private Boolean isDefault = false;
        private String barcode;

        @NotNull
        @DecimalMin(value = "0.0", message = "Tannarx manfiy bo'lmasligi kerak")
        private BigDecimal costPrice;

        @NotNull
        @DecimalMin(value = "0.0", message = "Sotuv narxi manfiy bo'lmasligi kerak")
        private BigDecimal salePrice;

        @NotNull
        @DecimalMin(value = "0.0", message = "Minimal narx manfiy bo'lmasligi kerak")
        private BigDecimal minPrice;

        private List<PriceTierRequest> priceTiers;

        // Boshlang'ich zaxira
        private BigDecimal initialStock;
        private Long warehouseId;

        // USD narxlar (ixtiyoriy)
        private BigDecimal costPriceUsd;
        private BigDecimal salePriceUsd;
        private BigDecimal minPriceUsd;
        private BigDecimal exchangeRateAtSave;
    }

    // ─────────────────────────────────────────
    // PriceTierRequest
    // ─────────────────────────────────────────
    @Data
    public static class PriceTierRequest {

        @NotNull
        private PriceTierType tierType;

        // QUANTITY uchun
        private BigDecimal minQuantity;
        private BigDecimal maxQuantity;

        // ROLE uchun
        private String roleName;

        @NotNull
        @DecimalMin(value = "0.0")
        private BigDecimal price;
    }
}