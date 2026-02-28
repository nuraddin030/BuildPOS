package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Sale;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
