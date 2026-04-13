package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Sale;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    boolean existsByReferenceNo(String referenceNo);

    @Modifying
    @Query("UPDATE Sale s SET s.status = :status WHERE s.id = :id")
    void updateStatus(@Param("id") Long id, @Param("status") SaleStatus status);

    // Kassir barcha DRAFT savatchalarni ko'radi
    Page<Sale> findAllByStatusOrderByCreatedAtDesc(SaleStatus status, Pageable pageable);

    // Sotuvchi faqat o'z savatchalarini ko'radi
    Page<Sale> findAllBySellerIdAndStatusOrderByCreatedAtDesc(
            Long sellerId, SaleStatus status, Pageable pageable);

    // ─────────────────────────────────────────────────────────────────
    // SOTUV TARIXI FILTER — native SQL (PostgreSQL enum muammo fix)
    // ─────────────────────────────────────────────────────────────────
    @Query(value = """
    SELECT s.* FROM sales s
    WHERE (CAST(:sellerId AS BIGINT)   IS NULL OR s.seller_id   = CAST(:sellerId AS BIGINT))
      AND (CAST(:customerId AS BIGINT) IS NULL OR s.customer_id = CAST(:customerId AS BIGINT))
      AND (CAST(:status AS VARCHAR)    IS NULL OR s.status      = CAST(:status AS VARCHAR))
      AND (CAST(:from AS TIMESTAMP)    IS NULL OR s.created_at >= CAST(:from AS TIMESTAMP))
      AND (CAST(:to AS TIMESTAMP)      IS NULL OR s.created_at <= CAST(:to AS TIMESTAMP))
    ORDER BY s.created_at DESC
""", nativeQuery = true,
            countQuery = """
    SELECT COUNT(*) FROM sales s
    WHERE (CAST(:sellerId AS BIGINT)   IS NULL OR s.seller_id   = CAST(:sellerId AS BIGINT))
      AND (CAST(:customerId AS BIGINT) IS NULL OR s.customer_id = CAST(:customerId AS BIGINT))
      AND (CAST(:status AS VARCHAR)    IS NULL OR s.status      = CAST(:status AS VARCHAR))
      AND (CAST(:from AS TIMESTAMP)    IS NULL OR s.created_at >= CAST(:from AS TIMESTAMP))
      AND (CAST(:to AS TIMESTAMP)      IS NULL OR s.created_at <= CAST(:to AS TIMESTAMP))
""")
    Page<Sale> findAllFiltered(
            @Param("sellerId")   Long sellerId,
            @Param("customerId") Long customerId,
            @Param("status")     String status,
            @Param("from")       LocalDateTime from,
            @Param("to")         LocalDateTime to,
            Pageable pageable
    );

    // DRAFT + HOLD — barcha ochiq savatchalar (admin uchun)
    @Query(value = """
        SELECT s.* FROM sales s
        WHERE s.status IN (:statuses)
        ORDER BY s.created_at DESC
    """, nativeQuery = true,
            countQuery = """
        SELECT COUNT(*) FROM sales s
        WHERE s.status IN (:statuses)
    """)
    Page<Sale> findAllByStatusInOrderByCreatedAtDesc(
            @Param("statuses") List<String> statuses, Pageable pageable);

    // Kassir o'z ochiq savatchalari (DRAFT + HOLD)
    @Query(value = """
        SELECT s.* FROM sales s
        WHERE s.seller_id = :sellerId
          AND s.status IN (:statuses)
        ORDER BY s.created_at DESC
    """, nativeQuery = true,
            countQuery = """
        SELECT COUNT(*) FROM sales s
        WHERE s.seller_id = :sellerId
          AND s.status IN (:statuses)
    """)
    Page<Sale> findAllBySellerIdAndStatusInOrderByCreatedAtDesc(
            @Param("sellerId") Long sellerId,
            @Param("statuses") List<String> statuses,
            Pageable pageable);

    // PENDING buyurtmalar — owner panel uchun
    Page<Sale> findAllByStatusOrderBySubmittedAtDesc(SaleStatus status, Pageable pageable);

    // Smena bo'yicha sotuvlar
    List<Sale> findAllByShiftId(Long shiftId);

    // ─────────────────────────────────────────────────────────────────
    // BUGUNGI STATISTIKA — SalesPage tezkor panel uchun
    // ─────────────────────────────────────────────────────────────────

    @Query(value = """
    SELECT
        COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) AS saleCount,
        COALESCE(SUM(CASE WHEN s.status = 'COMPLETED' THEN s.total_amount ELSE 0 END), 0) AS totalAmount,
        COALESCE(SUM(CASE WHEN s.status = 'COMPLETED' THEN s.discount_amount ELSE 0 END), 0) AS totalDiscount,
        COUNT(CASE WHEN s.status = 'CANCELLED' THEN 1 END) AS cancelledCount,
        COUNT(CASE WHEN s.status = 'RETURNED'  THEN 1 END) AS returnedCount
    FROM sales s
    WHERE s.status IN ('COMPLETED', 'CANCELLED', 'RETURNED')
      AND s.created_at >= :startOfDay
      AND s.created_at <  :endOfDay
""", nativeQuery = true)
    List<Object[]> getTodayStatsList(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay")   LocalDateTime endOfDay
    );

    @Query(value = """
        SELECT COALESCE(SUM(sp.amount), 0)
        FROM sales s
        JOIN sale_payments sp ON sp.sale_id = s.id
        WHERE s.status = 'COMPLETED'
          AND s.created_at >= :startOfDay
          AND s.created_at <  :endOfDay
          AND sp.payment_method = CAST(:method AS VARCHAR)
    """, nativeQuery = true)
    BigDecimal sumTodayByPaymentMethod(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay")   LocalDateTime endOfDay,
            @Param("method")     String method
    );

    @Query(value = """
        SELECT COALESCE(SUM(si.sale_price * si.returned_quantity), 0)
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE si.returned_quantity > 0
          AND s.created_at >= :startOfDay
          AND s.created_at <  :endOfDay
    """, nativeQuery = true)
    BigDecimal sumReturnedAmount(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay")   LocalDateTime endOfDay
    );

    // ─────────────────────────────────────────────────────────────────
    // DASHBOARD QUERY LAR (mavjud, o'zgartirilmadi)
    // ─────────────────────────────────────────────────────────────────

    @Query("""
        SELECT COUNT(s) FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
          AND s.completedAt >= :startOfDay
          AND s.completedAt < :endOfDay
    """)
    Long countTodaySales(@Param("startOfDay") LocalDateTime startOfDay,
                         @Param("endOfDay") LocalDateTime endOfDay);

    @Query("""
        SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
          AND s.completedAt >= :startOfDay
          AND s.completedAt < :endOfDay
    """)
    BigDecimal sumTodaySales(@Param("startOfDay") LocalDateTime startOfDay,
                             @Param("endOfDay") LocalDateTime endOfDay);

    @Query("""
        SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
          AND s.completedAt >= :startOfMonth
    """)
    BigDecimal sumMonthSales(@Param("startOfMonth") LocalDateTime startOfMonth);

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

    @Query("""
        SELECT s FROM Sale s
        WHERE s.status = com.buildpos.buildpos.entity.enums.SaleStatus.COMPLETED
        ORDER BY s.completedAt DESC
    """)
    List<Sale> findRecentSales(Pageable pageable);

    // ─────────────────────────────────────────────────────────────────
    // P&L HISOBOT QUERY LAR
    // ─────────────────────────────────────────────────────────────────

    /** Revenue, COGS, chegirmalar, sotuv soni — period uchun */
    @Query(value = """
        SELECT
            COUNT(DISTINCT s.id)                               AS sale_count,
            COALESCE(SUM(s.total_amount), 0)                   AS revenue,
            COALESCE(SUM(s.discount_amount), 0)                AS discounts,
            COALESCE(SUM(si.quantity * pu.cost_price), 0)      AS cogs
        FROM sales s
        JOIN sale_items si ON si.sale_id = s.id
        JOIN product_units pu ON pu.id = si.product_unit_id
        WHERE s.status = 'COMPLETED'
          AND s.completed_at >= :from
          AND s.completed_at <= :to
    """, nativeQuery = true)
    List<Object[]> getPLSummary(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );

    /** To'lov usuli bo'yicha breakdown */
    @Query(value = """
        SELECT sp.payment_method, COALESCE(SUM(sp.amount), 0)
        FROM sales s
        JOIN sale_payments sp ON sp.sale_id = s.id
        WHERE s.status = 'COMPLETED'
          AND s.completed_at >= :from
          AND s.completed_at <= :to
        GROUP BY sp.payment_method
    """, nativeQuery = true)
    List<Object[]> getPLPaymentBreakdown(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );

    /** Oylik trend — oxirgi 12 oy */
    @Query(value = """
        SELECT
            TO_CHAR(s.completed_at, 'YYYY-MM')                AS month,
            COALESCE(SUM(s.total_amount), 0)                   AS revenue,
            COALESCE(SUM(si.quantity * pu.cost_price), 0)      AS cogs
        FROM sales s
        JOIN sale_items si ON si.sale_id = s.id
        JOIN product_units pu ON pu.id = si.product_unit_id
        WHERE s.status = 'COMPLETED'
          AND s.completed_at >= :from12
        GROUP BY TO_CHAR(s.completed_at, 'YYYY-MM')
        ORDER BY TO_CHAR(s.completed_at, 'YYYY-MM')
    """, nativeQuery = true)
    List<Object[]> getPLMonthlyTrend(@Param("from12") LocalDateTime from12);

    /** Top 10 foydali mahsulotlar */
    @Query(value = """
        SELECT
            p.name                                             AS product_name,
            u.symbol                                           AS unit_symbol,
            SUM(si.quantity)                                   AS quantity,
            SUM(si.total_price)                                AS revenue,
            SUM(si.quantity * pu.cost_price)                   AS cogs,
            SUM(si.total_price) - SUM(si.quantity * pu.cost_price) AS profit
        FROM sale_items si
        JOIN product_units pu ON pu.id = si.product_unit_id
        JOIN products p       ON p.id  = pu.product_id
        JOIN units u          ON u.id  = pu.unit_id
        JOIN sales s          ON s.id  = si.sale_id
        WHERE s.status = 'COMPLETED'
          AND s.completed_at >= :from
          AND s.completed_at <= :to
        GROUP BY p.name, u.symbol
        ORDER BY (SUM(si.total_price) - SUM(si.quantity * pu.cost_price)) DESC
        LIMIT 10
    """, nativeQuery = true)
    List<Object[]> getPLTopProducts(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );

    // ── Dashboard: bugungi top 5 mahsulot ─────────────────────────────────
    @Query(value = """
        SELECT
            p.name          AS productName,
            u.symbol        AS unitSymbol,
            SUM(si.quantity) AS totalQuantity,
            SUM(si.total_price) AS totalAmount
        FROM sale_items si
        JOIN product_units pu ON pu.id = si.product_unit_id
        JOIN products p       ON p.id  = pu.product_id
        JOIN units u          ON u.id  = pu.unit_id
        JOIN sales s          ON s.id  = si.sale_id
        WHERE s.status = 'COMPLETED'
          AND s.completed_at >= :startOfDay
          AND s.completed_at <= :endOfDay
        GROUP BY p.name, u.symbol
        ORDER BY totalAmount DESC
        LIMIT 5
    """, nativeQuery = true)
    List<Object[]> findTopProductsToday(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay")   LocalDateTime endOfDay
    );
}