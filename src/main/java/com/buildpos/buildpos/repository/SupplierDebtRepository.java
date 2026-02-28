package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.SupplierDebt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierDebtRepository extends JpaRepository<SupplierDebt, Long> {

    // Yetkazuvchining barcha qarzlari
    List<SupplierDebt> findBySupplierId(Long supplierId);

    // To'lanmagan qarzlar
    List<SupplierDebt> findByIsPaidFalse();

    // Yetkazuvchining to'lanmagan qarzlari jami
    @Query("SELECT COALESCE(SUM(d.amount - d.paidAmount), 0) " +
            "FROM SupplierDebt d WHERE d.supplier.id = :supplierId AND d.isPaid = false")
    BigDecimal getTotalDebtBySupplierId(Long supplierId);

    // Purchase bilan bog'liq debt topish (yangi)
    Optional<SupplierDebt> findByPurchaseId(Long purchaseId);
}