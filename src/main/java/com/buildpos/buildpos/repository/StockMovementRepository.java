package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.StockMovement;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
// Note: findAllFiltered uses String for from/to to avoid PostgreSQL CAST null type issue

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findAllByProductUnitId(Long productUnitId, Pageable pageable);

    Page<StockMovement> findAllByMovementType(StockMovementType movementType, Pageable pageable);

    List<StockMovement> findAllByMovedAtBetween(LocalDateTime from, LocalDateTime to);

    @Query(value = """
        SELECT sm.* FROM stock_movements sm
        JOIN product_units pu ON pu.id = sm.product_unit_id
        JOIN products p ON p.id = pu.product_id
        WHERE (:productUnitId IS NULL OR sm.product_unit_id = :productUnitId)
          AND (:productId IS NULL OR pu.product_id = :productId)
          AND (:warehouseId   IS NULL OR sm.from_warehouse_id = :warehouseId
                                     OR sm.to_warehouse_id   = :warehouseId)
          AND (CAST(:movementType AS VARCHAR) IS NULL OR sm.movement_type = CAST(:movementType AS VARCHAR))
          AND (CAST(:from AS TIMESTAMP) IS NULL OR sm.moved_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP) IS NULL OR sm.moved_at <= CAST(:to   AS TIMESTAMP))
          AND (CAST(:productName AS VARCHAR) IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:productName AS VARCHAR), '%')))
        ORDER BY sm.moved_at DESC
    """, countQuery = """
        SELECT COUNT(*) FROM stock_movements sm
        JOIN product_units pu ON pu.id = sm.product_unit_id
        JOIN products p ON p.id = pu.product_id
        WHERE (:productUnitId IS NULL OR sm.product_unit_id = :productUnitId)
          AND (:productId IS NULL OR pu.product_id = :productId)
          AND (:warehouseId   IS NULL OR sm.from_warehouse_id = :warehouseId
                                     OR sm.to_warehouse_id   = :warehouseId)
          AND (CAST(:movementType AS VARCHAR) IS NULL OR sm.movement_type = CAST(:movementType AS VARCHAR))
          AND (CAST(:from AS TIMESTAMP) IS NULL OR sm.moved_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP) IS NULL OR sm.moved_at <= CAST(:to   AS TIMESTAMP))
          AND (CAST(:productName AS VARCHAR) IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:productName AS VARCHAR), '%')))
    """, nativeQuery = true)
    Page<StockMovement> findAllFiltered(
            @Param("productUnitId") Long productUnitId,
            @Param("productId")     Long productId,
            @Param("warehouseId")   Long warehouseId,
            @Param("movementType")  String movementType,
            @Param("from")          String from,
            @Param("to")            String to,
            @Param("productName")   String productName,
            Pageable pageable
    );

    @Query(value = "SELECT movement_type, COUNT(*) FROM stock_movements GROUP BY movement_type", nativeQuery = true)
    List<Object[]> countByMovementType();
}