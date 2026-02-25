package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.SupplierPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;

public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment, Long> {

    // Supplier bo'yicha barcha to'lovlar
    List<SupplierPayment> findBySupplierIdOrderByPaidAtDesc(Long supplierId);

    // Jami to'langan summa
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM SupplierPayment p WHERE p.supplier.id = :supplierId")
    BigDecimal getTotalPaidBySupplierId(Long supplierId);
}
