package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.PurchasePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PurchasePaymentRepository extends JpaRepository<PurchasePayment, Long> {

    List<PurchasePayment> findAllByPurchaseId(Long purchaseId);

    List<PurchasePayment> findAllBySupplierId(Long supplierId);

    @Query("""
        SELECT COALESCE(SUM(p.amount), 0)
        FROM PurchasePayment p
        WHERE p.purchase.id = :purchaseId
    """)
    BigDecimal getTotalPaidByPurchaseId(@Param("purchaseId") Long purchaseId);
}
