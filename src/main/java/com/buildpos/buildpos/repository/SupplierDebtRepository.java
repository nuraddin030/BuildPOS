package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.SupplierDebt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierDebtRepository extends JpaRepository<SupplierDebt, Long> {

    List<SupplierDebt> findBySupplierId(Long supplierId);

    List<SupplierDebt> findByIsPaidFalse();

    @Query("SELECT COALESCE(SUM(d.amount - d.paidAmount), 0) " +
            "FROM SupplierDebt d WHERE d.supplier.id = :supplierId AND d.isPaid = false")
    BigDecimal getTotalDebtBySupplierId(Long supplierId);

    Optional<SupplierDebt> findByPurchaseId(Long purchaseId);

    // ─────────────────────────────────────────
    // NasiyalarPage uchun — barcha qarzlar (filter + pagination)
    // ─────────────────────────────────────────
    @Query(value = """
        SELECT sd.* FROM supplier_debts sd
        JOIN suppliers s ON s.id = sd.supplier_id
        LEFT JOIN purchases p ON p.id = sd.purchase_id
        WHERE
            (CAST(:search AS VARCHAR) IS NULL
                OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')))
          AND (CAST(:isPaid AS BOOLEAN)    IS NULL OR sd.is_paid = CAST(:isPaid AS BOOLEAN))
          AND (CAST(:isOverdue AS BOOLEAN) IS NULL OR (
                sd.is_paid = false
                AND sd.due_date IS NOT NULL
                AND sd.due_date < CURRENT_DATE
              ) = CAST(:isOverdue AS BOOLEAN))
          AND (CAST(:from AS TIMESTAMP) IS NULL OR sd.created_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP) IS NULL OR sd.created_at <= CAST(:to   AS TIMESTAMP))
        ORDER BY sd.created_at DESC
    """, nativeQuery = true,
            countQuery = """
        SELECT COUNT(*) FROM supplier_debts sd
        JOIN suppliers s ON s.id = sd.supplier_id
        WHERE
            (CAST(:search AS VARCHAR) IS NULL
                OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')))
          AND (CAST(:isPaid AS BOOLEAN)    IS NULL OR sd.is_paid = CAST(:isPaid AS BOOLEAN))
          AND (CAST(:isOverdue AS BOOLEAN) IS NULL OR (
                sd.is_paid = false
                AND sd.due_date IS NOT NULL
                AND sd.due_date < CURRENT_DATE
              ) = CAST(:isOverdue AS BOOLEAN))
          AND (CAST(:from AS TIMESTAMP) IS NULL OR sd.created_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP) IS NULL OR sd.created_at <= CAST(:to   AS TIMESTAMP))
    """)
    Page<SupplierDebt> findAllFiltered(
            @Param("search")    String search,
            @Param("isPaid")    Boolean isPaid,
            @Param("isOverdue") Boolean isOverdue,
            @Param("from")      LocalDateTime from,
            @Param("to")        LocalDateTime to,
            Pageable pageable
    );

    // Umumiy statistika
    @Query("SELECT COALESCE(SUM(d.amount - d.paidAmount), 0) FROM SupplierDebt d WHERE d.isPaid = false")
    BigDecimal sumAllRemaining();

    @Query("SELECT COUNT(d) FROM SupplierDebt d WHERE d.isPaid = false")
    Long countAllOpen();

    @Query("""
        SELECT COUNT(d) FROM SupplierDebt d
        WHERE d.isPaid = false AND d.dueDate IS NOT NULL AND d.dueDate < :today
    """)
    Long countAllOverdue(@Param("today") LocalDate today);

    // ─────────────────────────────────────────
    // Tree view uchun — ochiq qarzlar (yetkazuvchi bo'yicha)
    // purchase LEFT JOIN bilan — referenceNo ko'rinsin
    // ─────────────────────────────────────────
    @Query(value = """
        SELECT sd.* FROM supplier_debts sd
        JOIN suppliers s ON s.id = sd.supplier_id
        LEFT JOIN purchases p ON p.id = sd.purchase_id
        WHERE sd.is_paid = false
          AND (CAST(:search AS VARCHAR) IS NULL
               OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')))
        ORDER BY s.name ASC, sd.created_at DESC
    """, nativeQuery = true)
    List<SupplierDebt> findAllOpenForTree(@Param("search") String search);

    // ─────────────────────────────────────────
    // Aging Report uchun
    // ─────────────────────────────────────────
    @Query(value = """
        SELECT
            sd.id,
            s.id           AS supplier_id,
            s.name         AS supplier_name,
            s.phone        AS supplier_phone,
            sd.amount,
            sd.paid_amount,
            (sd.amount - sd.paid_amount) AS remaining_amount,
            sd.created_at,
            CURRENT_DATE - sd.created_at::date AS days_overdue
        FROM supplier_debts sd
        JOIN suppliers s ON s.id = sd.supplier_id
        WHERE sd.is_paid = false
        ORDER BY days_overdue DESC
    """, nativeQuery = true)
    List<Object[]> findAllOpenForAging();
}