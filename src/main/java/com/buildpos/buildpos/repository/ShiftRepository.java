package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Shift;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    // Kassirning ochiq smenasi
    Optional<Shift> findByCashierIdAndStatus(Long cashierId, ShiftStatus status);

    // Istalgan ochiq smena (admin tomonidan ochilgan bo'lsa)
    Optional<Shift> findFirstByStatus(ShiftStatus status);

    // O'z smenalari
    Page<Shift> findAllByCashierIdOrderByOpenedAtDesc(Long cashierId, Pageable pageable);

    // Barcha smenalar (filter: kassir + sana oralig'i)
    @Query(value = """
        SELECT s.* FROM shifts s
        WHERE (CAST(:cashierId AS BIGINT) IS NULL OR s.cashier_id = CAST(:cashierId AS BIGINT))
          AND (CAST(:from AS TIMESTAMP) IS NULL OR s.opened_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP) IS NULL OR s.opened_at <= CAST(:to   AS TIMESTAMP))
        ORDER BY s.opened_at DESC
    """, nativeQuery = true)
    Page<Shift> findAllFiltered(
            @Param("cashierId") Long cashierId,
            @Param("from")      LocalDateTime from,
            @Param("to")        LocalDateTime to,
            Pageable pageable
    );

    // Mavjud (o'zgartirilmadi)
    Page<Shift> findAllByOrderByOpenedAtDesc(Pageable pageable);
}