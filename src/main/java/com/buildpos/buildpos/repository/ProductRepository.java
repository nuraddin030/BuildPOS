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

    @Query(value = """
        SELECT DISTINCT p.* FROM products p
        LEFT JOIN product_units pu ON pu.product_id = p.id
        WHERE p.is_deleted = false
          AND (:search IS NULL OR
               LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(p.sku)  LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(pu.barcode) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:categoryId IS NULL OR p.category_id = :categoryId)
          AND (CAST(:status AS VARCHAR) IS NULL OR p.status = :status)
        ORDER BY p.created_at DESC
    """,
            countQuery = """
        SELECT COUNT(DISTINCT p.id) FROM products p
        LEFT JOIN product_units pu ON pu.product_id = p.id
        WHERE p.is_deleted = false
          AND (:search IS NULL OR
               LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(p.sku)  LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(pu.barcode) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:categoryId IS NULL OR p.category_id = :categoryId)
          AND (CAST(:status AS VARCHAR) IS NULL OR p.status = :status)
    """,
            nativeQuery = true)
    Page<Product> findAllFiltered(
            @Param("search") String search,
            @Param("categoryId") Long categoryId,
            @Param("status") String status,
            Pageable pageable
    );

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