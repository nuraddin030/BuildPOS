package com.buildpos.buildpos.mapper;

import com.buildpos.buildpos.dto.response.ProductResponse;
import com.buildpos.buildpos.dto.response.ProductSummaryResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.repository.WarehouseStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ProductMapper {

    private final WarehouseStockRepository warehouseStockRepository;

    public ProductResponse toResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .description(product.getDescription())
                .sku(product.getSku())
                .imageUrl(product.getImageUrl())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .status(product.getStatus())
                .minStock(product.getMinStock())
                .units(mapUnits(product.getProductUnits()))
                .suppliers(mapSuppliers(product.getProductSuppliers()))
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .createdBy(product.getCreatedBy() != null ? product.getCreatedBy().getUsername() : null)
                .build();
    }

    public ProductSummaryResponse toSummaryResponse(Product product) {
        // Asosiy birlik (isBaseUnit=true) topish; yo'q bo'lsa isDefault ga fallback
        ProductUnit defaultUnit = product.getProductUnits().stream()
                .filter(pu -> Boolean.TRUE.equals(pu.getIsBaseUnit()))
                .findFirst()
                .orElseGet(() -> product.getProductUnits().stream()
                        .filter(pu -> Boolean.TRUE.equals(pu.getIsDefault()))
                        .findFirst()
                        .orElse(product.getProductUnits().isEmpty() ? null : product.getProductUnits().get(0)));

        // Umumiy stock — faqat asosiy birlik dan
        BigDecimal totalStock = defaultUnit != null
                ? warehouseStockRepository.getTotalStockByProductUnitId(defaultUnit.getId())
                : BigDecimal.ZERO;

        // Low stock tekshirish — totalStock vs minStock pragi (per-warehouse emas)
        BigDecimal minStockThreshold = defaultUnit != null
                ? defaultUnit.getWarehouseStocks().stream()
                        .map(WarehouseStock::getMinStock)
                        .filter(ms -> ms != null && ms.compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(BigDecimal.ZERO)
                : BigDecimal.ZERO;
        boolean isLowStock = minStockThreshold.compareTo(BigDecimal.ZERO) > 0
                && totalStock.compareTo(minStockThreshold) <= 0;

        return ProductSummaryResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .sku(product.getSku())
                .imageUrl(product.getImageUrl())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .status(product.getStatus())
                .defaultUnit(defaultUnit != null ? defaultUnit.getUnit().getName() : null)
                .defaultUnitSymbol(defaultUnit != null ? defaultUnit.getUnit().getSymbol() : null)
                .defaultBarcode(defaultUnit != null ? defaultUnit.getBarcode() : null)
                .defaultSalePrice(defaultUnit != null ? defaultUnit.getSalePrice() : null)
                .defaultCostPrice(defaultUnit != null ? defaultUnit.getCostPrice() : null)
                .totalStock(totalStock)
                .isLowStock(isLowStock)
                .createdAt(product.getCreatedAt())
                .build();
    }

    private List<ProductResponse.ProductUnitResponse> mapUnits(List<ProductUnit> units) {
        return units.stream().map(pu -> ProductResponse.ProductUnitResponse.builder()
                .id(pu.getId())
                .unitId(pu.getUnit().getId())
                .unitName(pu.getUnit().getName())
                .unitSymbol(pu.getUnit().getSymbol())
                .isDefault(pu.getIsDefault())
                .barcode(pu.getBarcode())
                .costPrice(pu.getCostPrice())
                .costPriceUsd(pu.getCostPriceUsd())
                .exchangeRateAtSave(pu.getExchangeRateAtSave())
                .salePrice(pu.getSalePrice())
                .minPrice(pu.getMinPrice())
                .isActive(pu.getIsActive())
                .conversionFactor(pu.getConversionFactor())
                .isBaseUnit(pu.getIsBaseUnit())
                .priceTiers(mapPriceTiers(pu.getPriceTiers()))
                .warehouseStocks(mapWarehouseStocks(pu.getWarehouseStocks()))
                .build()
        ).toList();
    }

    private List<ProductResponse.PriceTierResponse> mapPriceTiers(List<ProductPriceTier> tiers) {
        return tiers.stream().map(t -> ProductResponse.PriceTierResponse.builder()
                .id(t.getId())
                .tierType(t.getTierType())
                .minQuantity(t.getMinQuantity())
                .maxQuantity(t.getMaxQuantity())
                .roleName(t.getRoleName())
                .price(t.getPrice())
                .isActive(t.getIsActive())
                .build()
        ).toList();
    }

    private List<ProductResponse.WarehouseStockResponse> mapWarehouseStocks(List<WarehouseStock> stocks) {
        return stocks.stream().map(ws -> ProductResponse.WarehouseStockResponse.builder()
                .warehouseId(ws.getWarehouse().getId())
                .warehouseName(ws.getWarehouse().getName())
                .quantity(ws.getQuantity())
                .minStock(ws.getMinStock())
                .isLowStock(ws.getQuantity().compareTo(ws.getMinStock()) <= 0
                        && ws.getMinStock().compareTo(BigDecimal.ZERO) > 0)
                .build()
        ).toList();
    }

    private List<ProductResponse.ProductSupplierResponse> mapSuppliers(List<ProductSupplier> suppliers) {
        return suppliers.stream().map(ps -> ProductResponse.ProductSupplierResponse.builder()
                .supplierId(ps.getSupplier().getId())
                .supplierName(ps.getSupplier().getName())
                .supplierPrice(ps.getSupplierPrice())
                .isPreferred(ps.getIsPreferred())
                .build()
        ).toList();
    }
}