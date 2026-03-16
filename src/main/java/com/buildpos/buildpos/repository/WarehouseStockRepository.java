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

    // Dashboard: kam zaxiradagi mahsulotlar soni
    @Query("""
        SELECT COUNT(DISTINCT ws.productUnit.id)
        FROM WarehouseStock ws
        WHERE ws.minStock IS NOT NULL
          AND ws.quantity <= ws.minStock
    """)
    Long countLowStockItems();

    // Dashboard: kam zaxiradagi mahsulotlar ro'yxati (top 5)
    @Query(value = """
        SELECT
            pu.id           AS productUnitId,
            p.name          AS productName,
            u.symbol        AS unitSymbol,
            w.name          AS warehouseName,
            ws.quantity     AS currentStock,
            ws.min_stock    AS minStock
        FROM warehouse_stock ws
        JOIN product_units pu ON pu.id = ws.product_unit_id
        JOIN products p       ON p.id  = pu.product_id
        JOIN units u          ON u.id  = pu.unit_id
        JOIN warehouses w     ON w.id  = ws.warehouse_id
        WHERE ws.min_stock IS NOT NULL
          AND ws.quantity <= ws.min_stock
        ORDER BY (ws.quantity / NULLIF(ws.min_stock, 0)) ASC
        LIMIT 5
    """, nativeQuery = true)
    List<Object[]> findLowStockItems();
}