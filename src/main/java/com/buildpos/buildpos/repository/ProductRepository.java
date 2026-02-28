package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Product;
import com.buildpos.buildpos.entity.enums.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByIdAndIsDeletedFalse(Long id);

    boolean existsBySlugAndIsDeletedFalse(String slug);
    boolean existsBySkuAndIsDeletedFalse(String sku);

    @Query("""
        SELECT p FROM Product p
        WHERE p.isDeleted = false
          AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
                               OR LOWER(p.sku)  LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:categoryId IS NULL OR p.category.id = :categoryId)
          AND (:status IS NULL OR p.status = :status)
    """)
    Page<Product> findAllFiltered(
            @Param("search") String search,
            @Param("categoryId") Long categoryId,
            @Param("status") ProductStatus status,
            Pageable pageable
    );

    // Low stock mahsulotlar — warehouse_stock.quantity <= warehouse_stock.min_stock
    @Query("""
        SELECT DISTINCT p FROM Product p
        JOIN p.productUnits pu
        JOIN pu.warehouseStocks ws
        WHERE p.isDeleted = false
          AND p.status = 'ACTIVE'
          AND ws.quantity <= ws.minStock
    """)
    Page<Product> findLowStockProducts(Pageable pageable);
}