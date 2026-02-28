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

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findAllByProductUnitId(Long productUnitId, Pageable pageable);

    Page<StockMovement> findAllByMovementType(StockMovementType movementType, Pageable pageable);

    List<StockMovement> findAllByMovedAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("""
        SELECT sm FROM StockMovement sm
        WHERE (:productUnitId IS NULL OR sm.productUnit.id = :productUnitId)
          AND (:warehouseId   IS NULL OR sm.fromWarehouse.id = :warehouseId
                                     OR sm.toWarehouse.id   = :warehouseId)
          AND (:movementType  IS NULL OR sm.movementType = :movementType)
          AND (:from          IS NULL OR sm.movedAt >= :from)
          AND (:to            IS NULL OR sm.movedAt <= :to)
        ORDER BY sm.movedAt DESC
    """)
    Page<StockMovement> findAllFiltered(
            @Param("productUnitId") Long productUnitId,
            @Param("warehouseId")   Long warehouseId,
            @Param("movementType")  StockMovementType movementType,
            @Param("from")          LocalDateTime from,
            @Param("to")            LocalDateTime to,
            Pageable pageable
    );
}