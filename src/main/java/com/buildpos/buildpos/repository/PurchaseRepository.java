package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Purchase;
import com.buildpos.buildpos.entity.enums.PurchaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    Optional<Purchase> findByReferenceNo(String referenceNo);

    boolean existsByReferenceNo(String referenceNo);

    @Query(value = """
    SELECT * FROM purchases p
    WHERE (:supplierId IS NULL OR p.supplier_id = CAST(:supplierId AS BIGINT))
      AND (:warehouseId IS NULL OR p.warehouse_id = CAST(:warehouseId AS BIGINT))
      AND (CAST(:status AS VARCHAR) IS NULL OR p.status = CAST(:status AS VARCHAR))
      AND (CAST(:from AS TIMESTAMP) IS NULL OR p.created_at >= CAST(:from AS TIMESTAMP))
      AND (CAST(:to AS TIMESTAMP) IS NULL OR p.created_at <= CAST(:to AS TIMESTAMP))
    ORDER BY p.created_at DESC
""", countQuery = """
    SELECT COUNT(*) FROM purchases p
    WHERE (:supplierId IS NULL OR p.supplier_id = CAST(:supplierId AS BIGINT))
      AND (:warehouseId IS NULL OR p.warehouse_id = CAST(:warehouseId AS BIGINT))
      AND (CAST(:status AS VARCHAR) IS NULL OR p.status = CAST(:status AS VARCHAR))
      AND (CAST(:from AS TIMESTAMP) IS NULL OR p.created_at >= CAST(:from AS TIMESTAMP))
      AND (CAST(:to AS TIMESTAMP) IS NULL OR p.created_at <= CAST(:to AS TIMESTAMP))
""", nativeQuery = true)
    Page<Purchase> findAllFiltered(
            @Param("supplierId")  Long supplierId,
            @Param("warehouseId") Long warehouseId,
            @Param("status")      String status,
            @Param("from")        LocalDateTime from,
            @Param("to")          LocalDateTime to,
            Pageable pageable
    );

    // Dashboard: yetkazuvchilarga jami qarz
    @Query("""
        SELECT COALESCE(SUM(p.totalAmount - p.paidAmount), 0)
        FROM Purchase p
        WHERE p.status IN (
            com.buildpos.buildpos.entity.enums.PurchaseStatus.RECEIVED,
            com.buildpos.buildpos.entity.enums.PurchaseStatus.PARTIALLY_RECEIVED
        )
          AND p.paidAmount < p.totalAmount
    """)
    BigDecimal sumTotalSupplierDebt();
}