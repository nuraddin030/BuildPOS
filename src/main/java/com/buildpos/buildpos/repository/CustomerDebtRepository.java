package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.CustomerDebt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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

    // ─────────────────────────────────────────
    // NasiyalarPage uchun — barcha qarzlar (filter + pagination)
    // ─────────────────────────────────────────
    @Query(value = """
    SELECT cd.* FROM customer_debts cd
    JOIN customers c ON c.id = cd.customer_id
    LEFT JOIN sales s ON s.id = cd.sale_id
    WHERE
        (CAST(:search AS VARCHAR) IS NULL
            OR LOWER(c.name)  LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%'))
            OR LOWER(c.phone) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')))
      AND (CAST(:isPaid AS BOOLEAN)    IS NULL OR cd.is_paid = CAST(:isPaid AS BOOLEAN))
      AND (CAST(:isOverdue AS BOOLEAN) IS NULL OR (
            cd.is_paid = false
            AND cd.due_date IS NOT NULL
            AND cd.due_date < CURRENT_DATE
          ) = CAST(:isOverdue AS BOOLEAN))
      AND (CAST(:from AS TIMESTAMP) IS NULL OR cd.created_at >= CAST(:from AS TIMESTAMP))
      AND (CAST(:to   AS TIMESTAMP) IS NULL OR cd.created_at <= CAST(:to   AS TIMESTAMP))
    ORDER BY cd.created_at DESC
""", nativeQuery = true,
            countQuery = """
    SELECT COUNT(*) FROM customer_debts cd
    JOIN customers c ON c.id = cd.customer_id
    WHERE
        (CAST(:search AS VARCHAR) IS NULL
            OR LOWER(c.name)  LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%'))
            OR LOWER(c.phone) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')))
      AND (CAST(:isPaid AS BOOLEAN)    IS NULL OR cd.is_paid = CAST(:isPaid AS BOOLEAN))
      AND (CAST(:isOverdue AS BOOLEAN) IS NULL OR (
            cd.is_paid = false
            AND cd.due_date IS NOT NULL
            AND cd.due_date < CURRENT_DATE
          ) = CAST(:isOverdue AS BOOLEAN))
      AND (CAST(:from AS TIMESTAMP) IS NULL OR cd.created_at >= CAST(:from AS TIMESTAMP))
      AND (CAST(:to   AS TIMESTAMP) IS NULL OR cd.created_at <= CAST(:to   AS TIMESTAMP))
""")
    Page<CustomerDebt> findAllFiltered(
            @Param("search")    String search,
            @Param("isPaid")    Boolean isPaid,
            @Param("isOverdue") Boolean isOverdue,
            @Param("from")      LocalDateTime from,
            @Param("to")        LocalDateTime to,
            Pageable pageable
    );

    // Umumiy statistika (NasiyalarPage header uchun)
    @Query("""
        SELECT COALESCE(SUM(cd.amount - cd.paidAmount), 0)
        FROM CustomerDebt cd WHERE cd.isPaid = false
    """)
    BigDecimal sumAllRemaining();

    @Query("SELECT COUNT(cd) FROM CustomerDebt cd WHERE cd.isPaid = false")
    Long countAllOpen();

    @Query("""
        SELECT COUNT(cd) FROM CustomerDebt cd
        WHERE cd.isPaid = false AND cd.dueDate IS NOT NULL AND cd.dueDate < :today
    """)
    Long countAllOverdue(@Param("today") LocalDate today);

    // ─────────────────────────────────────────
    // Tree view uchun — sale LEFT JOIN bilan
    // ─────────────────────────────────────────
    @Query(value = """
        SELECT cd.* FROM customer_debts cd
        JOIN customers c ON c.id = cd.customer_id
        LEFT JOIN sales s ON s.id = cd.sale_id
        WHERE cd.is_paid = false
          AND (CAST(:search AS VARCHAR) IS NULL
               OR LOWER(c.name)  LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%'))
               OR LOWER(c.phone) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')))
        ORDER BY c.name ASC, cd.created_at DESC
    """, nativeQuery = true)
    List<CustomerDebt> findAllOpenForTree(@Param("search") String search);

    // ─────────────────────────────────────────
    // Dashboard — yaqin muddat va muddati o'tgan
    // ─────────────────────────────────────────
    @Query("""
        SELECT cd FROM CustomerDebt cd
        JOIN FETCH cd.customer
        WHERE cd.isPaid = false
          AND cd.dueDate IS NOT NULL
          AND cd.dueDate <= :endDate
        ORDER BY cd.dueDate ASC
    """)
    List<CustomerDebt> findUpcomingDebts(@Param("endDate") LocalDate endDate);

    // ─────────────────────────────────────────
    // Aging Report uchun
    // ─────────────────────────────────────────
    @Query(value = """
        SELECT
            cd.id,
            c.id           AS customer_id,
            c.name         AS customer_name,
            c.phone        AS customer_phone,
            cd.amount,
            cd.paid_amount,
            (cd.amount - cd.paid_amount) AS remaining_amount,
            cd.created_at,
            CURRENT_DATE - cd.created_at::date AS days_overdue
        FROM customer_debts cd
        JOIN customers c ON c.id = cd.customer_id
        WHERE cd.is_paid = false
        ORDER BY days_overdue DESC
    """, nativeQuery = true)
    List<Object[]> findAllOpenForAging();
}