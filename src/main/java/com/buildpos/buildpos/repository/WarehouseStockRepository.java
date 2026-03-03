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
}