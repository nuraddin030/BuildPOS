package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.SupplierDebt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupplierDebtRepository extends JpaRepository<SupplierDebt, Long> {


    // Yetkazuvchining barcha qarzlari
    List<SupplierDebt> findBySupplierId(Long supplierId);

    // To'lanmagan qarzlar
    List<SupplierDebt> findByIsPaidFalse();

    // Yetkazuvchining to'lanmagan qarzlari jami
    @Query("SELECT COALESCE(SUM(d.amount - d.paidAmount), 0) " +
            "FROM SupplierDebt d WHERE d.supplier.id = :supplierId AND d.isPaid = false")
    java.math.BigDecimal getTotalDebtBySupplierId(Long supplierId);
}