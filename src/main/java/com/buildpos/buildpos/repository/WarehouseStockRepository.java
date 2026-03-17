package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.WarehouseStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, Long> {

    Optional<WarehouseStock> findByWarehouseIdAndProductUnitId(Long warehouseId, Long productUnitId);

    List<WarehouseStock> findAllByProductUnitId(Long productUnitId);

    List<WarehouseStock> findAllByWarehouseId(Long warehouseId);

    @Query("""
        SELECT COALESCE(SUM(ws.quantity), 0)
        FROM WarehouseStock ws
        WHERE ws.productUnit.id = :productUnitId
    """)
    BigDecimal getTotalStockByProductUnitId(@Param("productUnitId") Long productUnitId);

    // Dashboard: kam zaxiradagi mahsulotlar soni (mahsulot bo'yicha guruhlab)
    @Query(value = """
        SELECT COUNT(*) FROM (
            SELECT pu.id
            FROM warehouse_stock ws
            JOIN product_units pu ON pu.id = ws.product_unit_id
            JOIN products p       ON p.id  = pu.product_id
            WHERE ws.min_stock IS NOT NULL
              AND ws.min_stock > 0
              AND (p.is_deleted = false OR p.is_deleted IS NULL)
            GROUP BY pu.id
            HAVING SUM(ws.quantity) <= MIN(ws.min_stock)
        ) t
    """, nativeQuery = true)
    Long countLowStockItems();

    // Dashboard: kam zaxiradagi mahsulotlar ro'yxati (top 5, mahsulot bo'yicha guruhlab)
    @Query(value = """
        SELECT
            pu.id                AS productUnitId,
            p.name               AS productName,
            u.symbol             AS unitSymbol,
            STRING_AGG(w.name, ', ' ORDER BY w.name) AS warehouseName,
            SUM(ws.quantity)     AS currentStock,
            MIN(ws.min_stock)    AS minStock
        FROM warehouse_stock ws
        JOIN product_units pu ON pu.id = ws.product_unit_id
        JOIN products p       ON p.id  = pu.product_id
        JOIN units u          ON u.id  = pu.unit_id
        JOIN warehouses w     ON w.id  = ws.warehouse_id
        WHERE ws.min_stock IS NOT NULL
          AND ws.min_stock > 0
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        GROUP BY pu.id, p.name, u.symbol
        HAVING SUM(ws.quantity) <= MIN(ws.min_stock)
        ORDER BY (SUM(ws.quantity) / NULLIF(MIN(ws.min_stock), 0)) ASC
        LIMIT 5
    """, nativeQuery = true)
    List<Object[]> findLowStockItems();
}