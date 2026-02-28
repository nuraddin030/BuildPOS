package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Purchase;
import com.buildpos.buildpos.entity.enums.PurchaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    Optional<Purchase> findByReferenceNo(String referenceNo);

    boolean existsByReferenceNo(String referenceNo);

    @Query("""
        SELECT p FROM Purchase p
        WHERE (:supplierId  IS NULL OR p.supplier.id  = :supplierId)
          AND (:warehouseId IS NULL OR p.warehouse.id = :warehouseId)
          AND (:status      IS NULL OR p.status       = :status)
          AND (:from        IS NULL OR p.createdAt   >= :from)
          AND (:to          IS NULL OR p.createdAt   <= :to)
        ORDER BY p.createdAt DESC
    """)
    Page<Purchase> findAllFiltered(
            @Param("supplierId")  Long supplierId,
            @Param("warehouseId") Long warehouseId,
            @Param("status")      PurchaseStatus status,
            @Param("from")        LocalDateTime from,
            @Param("to")          LocalDateTime to,
            Pageable pageable
    );
}
