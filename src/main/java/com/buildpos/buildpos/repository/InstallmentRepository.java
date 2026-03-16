package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.CustomerDebtInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface InstallmentRepository extends JpaRepository<CustomerDebtInstallment, Long> {

    List<CustomerDebtInstallment> findByCustomerDebtIdOrderByInstallmentNumberAsc(Long debtId);

    void deleteByCustomerDebtId(Long debtId);

    // Muddati o'tgan to'lanmagan installmentlar (dashboard/aging uchun)
    @Query("""
        SELECT i FROM CustomerDebtInstallment i
        WHERE i.isPaid = false
          AND i.dueDate < :today
          AND i.customerDebt.customer.id = :customerId
    """)
    List<CustomerDebtInstallment> findOverdueByCustomerId(
            @Param("customerId") Long customerId,
            @Param("today") LocalDate today);
}
