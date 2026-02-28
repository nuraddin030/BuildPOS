package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Partner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

public interface PartnerRepository extends JpaRepository<Partner, Long> {

    boolean existsByPhone(String phone);

    Optional<Partner> findByPhone(String phone);

    @Query("""
        SELECT p FROM Partner p
        WHERE (:search IS NULL
            OR LOWER(p.name)  LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(p.phone) LIKE LOWER(CONCAT('%', :search, '%')))
    """)
    Page<Partner> findAllFiltered(@Param("search") String search, Pageable pageable);

    // Statistika uchun querylar
    @Query("""
        SELECT COUNT(s) FROM Sale s
        WHERE s.partner.id = :partnerId
          AND s.status = 'COMPLETED'
    """)
    Long countCompletedSalesByPartnerId(@Param("partnerId") Long partnerId);

    @Query("""
        SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s
        WHERE s.partner.id = :partnerId
          AND s.status = 'COMPLETED'
    """)
    BigDecimal sumTotalAmountByPartnerId(@Param("partnerId") Long partnerId);

    @Query("""
        SELECT COALESCE(AVG(s.totalAmount), 0) FROM Sale s
        WHERE s.partner.id = :partnerId
          AND s.status = 'COMPLETED'
    """)
    BigDecimal avgTotalAmountByPartnerId(@Param("partnerId") Long partnerId);

    @Query("""
        SELECT COUNT(DISTINCT s.customer.id) FROM Sale s
        WHERE s.partner.id = :partnerId
          AND s.customer IS NOT NULL
          AND s.status = 'COMPLETED'
    """)
    Long countDistinctCustomersByPartnerId(@Param("partnerId") Long partnerId);

    @Query("""
        SELECT COUNT(s) FROM Sale s
        WHERE s.partner.id = :partnerId
          AND s.status = 'COMPLETED'
          AND s.debtAmount = 0
    """)
    Long countPaidSalesByPartnerId(@Param("partnerId") Long partnerId);

    @Query("""
        SELECT COUNT(s) FROM Sale s
        WHERE s.partner.id = :partnerId
          AND s.status = 'COMPLETED'
          AND s.debtAmount > 0
    """)
    Long countDebtSalesByPartnerId(@Param("partnerId") Long partnerId);

    @Query("""
        SELECT MAX(s.completedAt) FROM Sale s
        WHERE s.partner.id = :partnerId
          AND s.status = 'COMPLETED'
    """)
    LocalDateTime findLastSaleAtByPartnerId(@Param("partnerId") Long partnerId);

    @Query(value = """
        SELECT TO_CHAR(completed_at, 'YYYY-MM') as month
        FROM sales
        WHERE partner_id = :partnerId AND status = 'COMPLETED'
        GROUP BY month
        ORDER BY COUNT(*) DESC
        LIMIT 1
    """, nativeQuery = true)
    String findBestMonthByPartnerId(@Param("partnerId") Long partnerId);
}
