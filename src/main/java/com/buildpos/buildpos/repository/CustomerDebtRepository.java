package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.CustomerDebt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CustomerDebtRepository extends JpaRepository<CustomerDebt, Long> {

    List<CustomerDebt> findAllByCustomerIdAndIsPaidFalse(Long customerId);

    List<CustomerDebt> findAllByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<CustomerDebt> findBySaleId(Long saleId);

    // Mijoz bo'yicha qolgan qarz summasi
    @Query("""
        SELECT COALESCE(SUM(cd.amount - cd.paidAmount), 0)
        FROM CustomerDebt cd
        WHERE cd.customer.id = :customerId AND cd.isPaid = false
    """)
    BigDecimal getTotalDebtByCustomerId(@Param("customerId") Long customerId);

    // ─────────────────────────────────────────
    // Dashboard query lar
    // ─────────────────────────────────────────

    // Jami barcha mijozlarning qolgan qarzi
    @Query("""
        SELECT COALESCE(SUM(cd.amount - cd.paidAmount), 0)
        FROM CustomerDebt cd
        WHERE cd.isPaid = false
    """)
    BigDecimal sumTotalRemainingDebt();

    // Ochiq nasiyalar soni
    @Query("SELECT COUNT(cd) FROM CustomerDebt cd WHERE cd.isPaid = false")
    Long countOpenDebts();

    // Muddati o'tgan nasiyalar soni
    @Query("""
        SELECT COUNT(cd) FROM CustomerDebt cd
        WHERE cd.isPaid = false
          AND cd.dueDate IS NOT NULL
          AND cd.dueDate < :today
    """)
    Long countOverdueDebts(@Param("today") LocalDate today);

    // Muddati o'tgan nasiyalar summasi
    @Query("""
        SELECT COALESCE(SUM(cd.amount - cd.paidAmount), 0)
        FROM CustomerDebt cd
        WHERE cd.isPaid = false
          AND cd.dueDate IS NOT NULL
          AND cd.dueDate < :today
    """)
    BigDecimal sumOverdueDebtAmount(@Param("today") LocalDate today);
}