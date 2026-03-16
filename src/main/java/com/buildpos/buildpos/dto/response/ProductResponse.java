package com.buildpos.buildpos.dto.response;

import com.buildpos.buildpos.entity.enums.PriceTierType;
import com.buildpos.buildpos.entity.enums.ProductStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// ─────────────────────────────────────────────
// ProductResponse — to'liq ma'lumot
// ─────────────────────────────────────────────
@Data
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private String sku;
    private String imageUrl;

    private Long categoryId;
    private String categoryName;

    private ProductStatus status;
    private BigDecimal minStock;

    private List<ProductUnitResponse> units;
    private List<ProductSupplierResponse> suppliers;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    // ─────────────────────────────────────────
    // ProductUnitResponse
    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class ProductUnitResponse {
        private Long id;
        private Long unitId;
        private String unitName;
        private String unitSymbol;
        private Boolean isDefault;
        private String barcode;
        private BigDecimal costPrice;       // UZS da (hisoblangan)
        private BigDecimal salePrice;       // UZS da
        private BigDecimal minPrice;        // UZS da
        // ✅ USD narxlar — frontend edit uchun
        private BigDecimal costPriceUsd;    // null bo'lsa — UZS da kiritilgan
        private BigDecimal exchangeRateAtSave; // saqlash vaqtidagi kurs
        private Boolean isActive;
        private List<PriceTierResponse> priceTiers;
        private List<WarehouseStockResponse> warehouseStocks;
    }

    // ─────────────────────────────────────────
    // PriceTierResponse
    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class PriceTierResponse {
        private Long id;
        private PriceTierType tierType;
        private BigDecimal minQuantity;
        private BigDecimal maxQuantity;
        private String roleName;
        private BigDecimal price;
        private Boolean isActive;
    }

    // ─────────────────────────────────────────
    // WarehouseStockResponse
    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class WarehouseStockResponse {
        private Long warehouseId;
        private String warehouseName;
        private BigDecimal quantity;
        private BigDecimal minStock;
        private Boolean isLowStock;
    }

    // ─────────────────────────────────────────
    // ProductSupplierResponse
    // ─────────────────────────────────────────
    @Data
    @Builder
    public static class ProductSupplierResponse {
        private Long supplierId;
        private String supplierName;
        private BigDecimal supplierPrice;
        private Boolean isPreferred;
    }
}