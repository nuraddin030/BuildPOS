package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Sale;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    boolean existsByReferenceNo(String referenceNo);

    // Kassir barcha DRAFT savatchalarni ko'radi
    Page<Sale> findAllByStatusOrderByCreatedAtDesc(SaleStatus status, Pageable pageable);

    // Sotuvchi faqat o'z savatchalarini ko'radi
    Page<Sale> findAllBySellerIdAndStatusOrderByCreatedAtDesc(
            Long sellerId, SaleStatus status, Pageable pageable);

    @Query("""
        SELECT s FROM Sale s
        WHERE (:sellerId   IS NULL OR s.seller.id   = :sellerId)
          AND (:customerId IS NULL OR s.customer.id = :customerId)
          AND (:status     IS NULL OR s.status      = :status)
          AND (:from       IS NULL OR s.createdAt  >= :from)
          AND (:to         IS NULL OR s.createdAt  <= :to)
        ORDER BY s.createdAt DESC
    """)
    Page<Sale> findAllFiltered(
            @Param("sellerId")   Long sellerId,
            @Param("customerId") Long customerId,
            @Param("status")     SaleStatus status,
            @Param("from")       LocalDateTime from,
            @Param("to")         LocalDateTime to,
            Pageable pageable
    );

    // Smena bo'yicha sotuvlar
    List<Sale> findAllByShiftId(Long shiftId);

    // ─────────────────────────────────────────
    // Dashboard query lar
    // ─────────────────────────────────────────

    // Bugungi sotuvlar soni
    @Query("""
        SELECT COUNT(s) FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
          AND s.completedAt >= :startOfDay
          AND s.completedAt < :endOfDay
    """)
    Long countTodaySales(@Param("startOfDay") LocalDateTime startOfDay,
                         @Param("endOfDay") LocalDateTime endOfDay);

    // Bugungi sotuv summasi
    @Query("""
        SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
          AND s.completedAt >= :startOfDay
          AND s.completedAt < :endOfDay
    """)
    BigDecimal sumTodaySales(@Param("startOfDay") LocalDateTime startOfDay,
                             @Param("endOfDay") LocalDateTime endOfDay);

    // Bugungi tushumlar — to'lov usuli bo'yicha (CASH, CARD, TRANSFER)
    @Query(value = """
        SELECT COALESCE(SUM(sp.amount), 0)
        FROM sales s
        JOIN sale_payments sp ON sp.sale_id = s.id
        WHERE s.status = 'COMPLETED'
          AND s.completed_at >= :startOfDay
          AND s.completed_at < :endOfDay
          AND sp.payment_method = :method
    """, nativeQuery = true)
    BigDecimal sumTodayByPaymentMethod(@Param("startOfDay") LocalDateTime startOfDay,
                                       @Param("endOfDay") LocalDateTime endOfDay,
                                       @Param("method") String method);

    // Joriy oy sotuv summasi
    @Query("""
        SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
          AND s.completedAt >= :startOfMonth
    """)
    BigDecimal sumMonthSales(@Param("startOfMonth") LocalDateTime startOfMonth);

    // Haftalik sotuv (oxirgi 7 kun, kunlik breakdown)
    @Query(value = """
        SELECT
            TO_CHAR(DATE(s.completed_at), 'YYYY-MM-DD') AS sale_date,
            COALESCE(SUM(s.total_amount), 0)            AS total,
            COUNT(s.id)                                  AS cnt
        FROM sales s
        WHERE s.status = 'COMPLETED'
          AND s.completed_at >= :weekAgo
        GROUP BY DATE(s.completed_at)
        ORDER BY DATE(s.completed_at)
    """, nativeQuery = true)
    List<Object[]> getWeeklySales(@Param("weekAgo") LocalDateTime weekAgo);

    // So'nggi N ta sotuv
    @Query("""
        SELECT s FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
        ORDER BY s.completedAt DESC
    """)
    List<Sale> findRecentSales(Pageable pageable);
}