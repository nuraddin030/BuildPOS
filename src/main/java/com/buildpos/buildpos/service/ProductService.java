package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.ProductRequest;
import com.buildpos.buildpos.dto.request.StockAdjustmentRequest;
import com.buildpos.buildpos.dto.request.StockTransferRequest;
import com.buildpos.buildpos.dto.response.ProductResponse;
import com.buildpos.buildpos.dto.response.ProductSummaryResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.entity.enums.ProductStatus;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.exception.AlreadyExistsException;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.mapper.ProductMapper;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;
    private final UnitRepository unitRepository;
    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final ProductMapper productMapper;

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @Transactional
    public ProductResponse create(ProductRequest request) {
        // Slug generatsiya
        String slug = generateSlug(request.getName());
        if (productRepository.existsBySlugAndIsDeletedFalse(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        // SKU tekshirish
        if (request.getSku() != null && productRepository.existsBySkuAndIsDeletedFalse(request.getSku())) {
            throw new AlreadyExistsException("Bu SKU allaqachon mavjud: " + request.getSku());
        }

        // Default unit tekshirish — faqat bitta default bo'lishi kerak
        long defaultCount = request.getUnits().stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsDefault()))
                .count();
        if (defaultCount == 0) {
            request.getUnits().get(0).setIsDefault(true);
        }
        if (defaultCount > 1) {
            throw new BadRequestException("Faqat bitta asosiy o'lchov birligi bo'lishi mumkin");
        }

        Product product = Product.builder()
                .name(request.getName())
                .slug(slug)
                .description(request.getDescription())
                .sku(request.getSku())
                .imageUrl(request.getImageUrl())
                .status(ProductStatus.ACTIVE)
                .isDeleted(false)
                .build();

        // Kategoriya
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new NotFoundException("Kategoriya topilmadi: " + request.getCategoryId()));
            product.setCategory(category);
        }

        product = productRepository.save(product);

        // Product units
        for (ProductRequest.ProductUnitRequest unitReq : request.getUnits()) {
            Unit unit = unitRepository.findById(unitReq.getUnitId())
                    .orElseThrow(() -> new NotFoundException("O'lchov birligi topilmadi: " + unitReq.getUnitId()));

            // Barcode tekshirish
            if (unitReq.getBarcode() != null &&
                    productUnitRepository.existsByBarcodeAndIdNot(unitReq.getBarcode(), 0L)) {
                throw new AlreadyExistsException("Bu barcode allaqachon mavjud: " + unitReq.getBarcode());
            }

            ProductUnit productUnit = ProductUnit.builder()
                    .product(product)
                    .unit(unit)
                    .isDefault(Boolean.TRUE.equals(unitReq.getIsDefault()))
                    .barcode(unitReq.getBarcode())
                    .costPrice(unitReq.getCostPrice())
                    .salePrice(unitReq.getSalePrice())
                    .minPrice(unitReq.getMinPrice())
                    .isActive(true)
                    .build();

            // Price tiers
            if (unitReq.getPriceTiers() != null) {
                for (ProductRequest.PriceTierRequest tierReq : unitReq.getPriceTiers()) {
                    ProductPriceTier tier = ProductPriceTier.builder()
                            .productUnit(productUnit)
                            .tierType(tierReq.getTierType())
                            .minQuantity(tierReq.getMinQuantity())
                            .maxQuantity(tierReq.getMaxQuantity())
                            .roleName(tierReq.getRoleName())
                            .price(tierReq.getPrice())
                            .isActive(true)
                            .build();
                    productUnit.getPriceTiers().add(tier);
                }
            }

            productUnit = productUnitRepository.save(productUnit);

            // Har bir ombor uchun stock yozuv yaratish
            List<Warehouse> warehouses = warehouseRepository.findAllByIsActiveTrue();
            for (Warehouse warehouse : warehouses) {
                // Boshlang'ich zaxira faqat tanlangan omborga
                BigDecimal qty = BigDecimal.ZERO;
                if (unitReq.getInitialStock() != null
                        && unitReq.getWarehouseId() != null
                        && warehouse.getId().equals(unitReq.getWarehouseId())) {
                    qty = unitReq.getInitialStock();
                }
                WarehouseStock stock = WarehouseStock.builder()
                        .warehouse(warehouse)
                        .productUnit(productUnit)
                        .quantity(qty)
                        .minStock(BigDecimal.ZERO)
                        .build();
                warehouseStockRepository.save(stock);
            }

            // Agar warehouseId ko'rsatilgan ombor faol omborlar ro'yxatida bo'lmasa — alohida qo'shish
            if (unitReq.getInitialStock() != null
                    && unitReq.getInitialStock().compareTo(BigDecimal.ZERO) > 0
                    && unitReq.getWarehouseId() != null) {
                boolean warehouseFound = warehouses.stream()
                        .anyMatch(w -> w.getId().equals(unitReq.getWarehouseId()));
                if (!warehouseFound) {
                    Warehouse warehouse = warehouseRepository.findById(unitReq.getWarehouseId())
                            .orElseThrow(() -> new NotFoundException("Ombor topilmadi: " + unitReq.getWarehouseId()));
                    WarehouseStock stock = WarehouseStock.builder()
                            .warehouse(warehouse)
                            .productUnit(productUnit)
                            .quantity(unitReq.getInitialStock())
                            .minStock(BigDecimal.ZERO)
                            .build();
                    warehouseStockRepository.save(stock);
                }

                // StockMovement yozuv
                final ProductUnit finalProductUnit = productUnit;
                Warehouse selectedWarehouse = warehouses.stream()
                        .filter(w -> w.getId().equals(unitReq.getWarehouseId()))
                        .findFirst()
                        .orElse(null);
                if (selectedWarehouse != null) {
                    StockMovement movement = StockMovement.builder()
                            .productUnit(finalProductUnit)
                            .movementType(StockMovementType.ADJUSTMENT_IN)
                            .toWarehouse(selectedWarehouse)
                            .quantity(unitReq.getInitialStock())
                            .unitPrice(unitReq.getCostPrice())
                            .totalPrice(unitReq.getCostPrice() != null
                                    ? unitReq.getCostPrice().multiply(unitReq.getInitialStock())
                                    : null)
                            .notes("Boshlang'ich zaxira")
                            .referenceType("INITIAL_STOCK")
                            .build();
                    stockMovementRepository.save(movement);
                }
            }
        }

        // Supplierlar
        if (request.getSupplierIds() != null) {
            for (Long supplierId : request.getSupplierIds()) {
                Supplier supplier = supplierRepository.findById(supplierId)
                        .orElseThrow(() -> new NotFoundException("Supplier topilmadi: " + supplierId));
                ProductSupplier ps = ProductSupplier.builder()
                        .product(product)
                        .supplier(supplier)
                        .isPreferred(false)
                        .build();
                product.getProductSuppliers().add(ps);
            }
            productRepository.save(product);
        }

        return getById(product.getId());
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public ProductResponse getById(Long id) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Mahsulot topilmadi: " + id));
        return productMapper.toResponse(product);
    }

    // ─────────────────────────────────────────
    // GET BY BARCODE (POS skaner uchun)
    // ─────────────────────────────────────────
    public ProductResponse getByBarcode(String barcode) {
        ProductUnit productUnit = productUnitRepository.findByBarcode(barcode)
                .orElseThrow(() -> new NotFoundException("Barcode topilmadi: " + barcode));
        return productMapper.toResponse(productUnit.getProduct());
    }

    // ─────────────────────────────────────────
    // LIST (pagination + filter)
    // ─────────────────────────────────────────
    public Page<ProductSummaryResponse> getAll(
            String search, Long categoryId, ProductStatus status, Pageable pageable) {
        return productRepository.findAllFiltered(search, categoryId, status != null ? status.name() : null, pageable)
                .map(productMapper::toSummaryResponse);
    }

    // ─────────────────────────────────────────
    // LOW STOCK
    // ─────────────────────────────────────────
    public Page<ProductSummaryResponse> getLowStockProducts(Pageable pageable) {
        return productRepository.findLowStockProducts(pageable)
                .map(productMapper::toSummaryResponse);
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Mahsulot topilmadi: " + id));

        // SKU tekshirish
        if (request.getSku() != null &&
                !request.getSku().equals(product.getSku()) &&
                productRepository.existsBySkuAndIsDeletedFalse(request.getSku())) {
            throw new AlreadyExistsException("Bu SKU allaqachon mavjud: " + request.getSku());
        }

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setSku(request.getSku());
        product.setImageUrl(request.getImageUrl());

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new NotFoundException("Kategoriya topilmadi"));
            product.setCategory(category);
        } else {
            product.setCategory(null);
        }

        // Units narxlarini yangilash + price history saqlash
        if (request.getUnits() != null) {
            for (ProductRequest.ProductUnitRequest unitReq : request.getUnits()) {
                productUnitRepository.findByProductIdAndIsDefaultTrue(product.getId())
                        .ifPresent(pu -> {
                            savePriceHistoryIfChanged(pu, "cost_price", pu.getCostPrice(), unitReq.getCostPrice());
                            savePriceHistoryIfChanged(pu, "sale_price", pu.getSalePrice(), unitReq.getSalePrice());
                            savePriceHistoryIfChanged(pu, "min_price", pu.getMinPrice(), unitReq.getMinPrice());
                            pu.setCostPrice(unitReq.getCostPrice());
                            pu.setSalePrice(unitReq.getSalePrice());
                            pu.setMinPrice(unitReq.getMinPrice());
                            pu.setBarcode(unitReq.getBarcode());
                            productUnitRepository.save(pu);
                        });
            }
        }

        productRepository.save(product);
        return productMapper.toResponse(product);
    }

    // ─────────────────────────────────────────
    // TOGGLE STATUS
    // ─────────────────────────────────────────
    @Transactional
    public ProductResponse toggleStatus(Long id) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Mahsulot topilmadi: " + id));

        product.setStatus(
                product.getStatus() == ProductStatus.ACTIVE
                        ? ProductStatus.INACTIVE
                        : ProductStatus.ACTIVE
        );

        return productMapper.toResponse(productRepository.save(product));
    }

    // ─────────────────────────────────────────
    // SOFT DELETE
    // ─────────────────────────────────────────
    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Mahsulot topilmadi: " + id));
        product.setIsDeleted(true);
        product.setDeletedAt(LocalDateTime.now());
        productRepository.save(product);
    }

    // ─────────────────────────────────────────
    // STOCK ADJUSTMENT (qo'lda kirim/chiqim)
    // ─────────────────────────────────────────
    @Transactional
    public void adjustStock(StockAdjustmentRequest request) {
        ProductUnit productUnit = productUnitRepository.findById(request.getProductUnitId())
                .orElseThrow(() -> new NotFoundException("Product unit topilmadi"));

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new NotFoundException("Ombor topilmadi"));

        WarehouseStock stock = warehouseStockRepository
                .findByWarehouseIdAndProductUnitId(warehouse.getId(), productUnit.getId())
                .orElseGet(() -> WarehouseStock.builder()
                        .warehouse(warehouse)
                        .productUnit(productUnit)
                        .quantity(BigDecimal.ZERO)
                        .minStock(BigDecimal.ZERO)
                        .build());

        if (request.getMovementType() == StockMovementType.ADJUSTMENT_IN) {
            stock.setQuantity(stock.getQuantity().add(request.getQuantity()));
        } else if (request.getMovementType() == StockMovementType.ADJUSTMENT_OUT) {
            if (stock.getQuantity().compareTo(request.getQuantity()) < 0) {
                throw new BadRequestException("Omborda yetarli mahsulot yo'q");
            }
            stock.setQuantity(stock.getQuantity().subtract(request.getQuantity()));
        } else {
            throw new BadRequestException("Noto'g'ri harakat turi");
        }

        warehouseStockRepository.save(stock);

        // Movement yozing
        BigDecimal total = request.getUnitPrice() != null
                ? request.getUnitPrice().multiply(request.getQuantity())
                : null;

        StockMovement movement = StockMovement.builder()
                .productUnit(productUnit)
                .movementType(request.getMovementType())
                .fromWarehouse(request.getMovementType() == StockMovementType.ADJUSTMENT_OUT ? warehouse : null)
                .toWarehouse(request.getMovementType() == StockMovementType.ADJUSTMENT_IN ? warehouse : null)
                .quantity(request.getQuantity())
                .unitPrice(request.getUnitPrice())
                .totalPrice(total)
                .notes(request.getNotes())
                .build();

        stockMovementRepository.save(movement);
    }

    // ─────────────────────────────────────────
    // STOCK TRANSFER (omborlar orasida)
    // ─────────────────────────────────────────
    @Transactional
    public void transferStock(StockTransferRequest request) {
        if (request.getFromWarehouseId().equals(request.getToWarehouseId())) {
            throw new BadRequestException("Manba va maqsad ombor bir xil bo'lmasligi kerak");
        }

        ProductUnit productUnit = productUnitRepository.findById(request.getProductUnitId())
                .orElseThrow(() -> new NotFoundException("Product unit topilmadi"));

        Warehouse fromWarehouse = warehouseRepository.findById(request.getFromWarehouseId())
                .orElseThrow(() -> new NotFoundException("Manba ombor topilmadi"));

        Warehouse toWarehouse = warehouseRepository.findById(request.getToWarehouseId())
                .orElseThrow(() -> new NotFoundException("Maqsad ombor topilmadi"));

        // Manba ombordan ayirish
        WarehouseStock fromStock = warehouseStockRepository
                .findByWarehouseIdAndProductUnitId(fromWarehouse.getId(), productUnit.getId())
                .orElseThrow(() -> new NotFoundException("Manba omborda bu mahsulot yo'q"));

        if (fromStock.getQuantity().compareTo(request.getQuantity()) < 0) {
            throw new BadRequestException("Manba omborda yetarli mahsulot yo'q");
        }

        fromStock.setQuantity(fromStock.getQuantity().subtract(request.getQuantity()));
        warehouseStockRepository.save(fromStock);

        // Maqsad omborgа qo'shish
        WarehouseStock toStock = warehouseStockRepository
                .findByWarehouseIdAndProductUnitId(toWarehouse.getId(), productUnit.getId())
                .orElseGet(() -> WarehouseStock.builder()
                        .warehouse(toWarehouse)
                        .productUnit(productUnit)
                        .quantity(BigDecimal.ZERO)
                        .minStock(BigDecimal.ZERO)
                        .build());

        toStock.setQuantity(toStock.getQuantity().add(request.getQuantity()));
        warehouseStockRepository.save(toStock);

        // Transfer movementlari (chiqim + kirim)
        StockMovement out = StockMovement.builder()
                .productUnit(productUnit)
                .movementType(StockMovementType.TRANSFER_OUT)
                .fromWarehouse(fromWarehouse)
                .toWarehouse(toWarehouse)
                .quantity(request.getQuantity())
                .notes(request.getNotes())
                .referenceType("TRANSFER")
                .build();

        StockMovement in = StockMovement.builder()
                .productUnit(productUnit)
                .movementType(StockMovementType.TRANSFER_IN)
                .fromWarehouse(fromWarehouse)
                .toWarehouse(toWarehouse)
                .quantity(request.getQuantity())
                .notes(request.getNotes())
                .referenceType("TRANSFER")
                .build();

        stockMovementRepository.save(out);
        stockMovementRepository.save(in);
    }

    // ─────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────
    private String generateSlug(String name) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized)
                .replaceAll("")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("[\\s]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private void savePriceHistoryIfChanged(ProductUnit pu, String fieldName,
                                           BigDecimal oldVal, BigDecimal newVal) {
        if (newVal != null && oldVal.compareTo(newVal) != 0) {
            ProductPriceHistory history = ProductPriceHistory.builder()
                    .productUnit(pu)
                    .fieldName(fieldName)
                    .oldValue(oldVal)
                    .newValue(newVal)
                    .build();
            // history repository inject qilib saqlash mumkin
            // Bu yerda @Autowire qilish yoki separate service orqali
        }
    }
}