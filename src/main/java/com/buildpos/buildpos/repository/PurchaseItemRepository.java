package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.PurchaseItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {

    List<PurchaseItem> findAllByPurchaseId(Long purchaseId);

    @Query("""
            SELECT pi FROM PurchaseItem pi
            WHERE pi.productUnit.id = :productUnitId
              AND pi.purchase.supplier.id = :supplierId
              AND pi.purchase.status <> com.buildpos.buildpos.entity.enums.PurchaseStatus.CANCELLED
            ORDER BY pi.createdAt DESC
            """)
    List<PurchaseItem> findLastBySupplierAndProductUnit(
            @Param("productUnitId") Long productUnitId,
            @Param("supplierId") Long supplierId,
            Pageable pageable
    );

    @Query("""
            SELECT pi FROM PurchaseItem pi
            WHERE pi.productUnit.id = :productUnitId
              AND pi.purchase.status <> com.buildpos.buildpos.entity.enums.PurchaseStatus.CANCELLED
            ORDER BY pi.createdAt DESC
            """)
    List<PurchaseItem> findLastByProductUnit(
            @Param("productUnitId") Long productUnitId,
            Pageable pageable
    );
}