package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query(value = """
        SELECT * FROM audit_logs
        WHERE (CAST(:username AS VARCHAR) IS NULL OR LOWER(username) LIKE LOWER(CONCAT('%', CAST(:username AS VARCHAR), '%')))
          AND (CAST(:action   AS VARCHAR) IS NULL OR action = CAST(:action AS VARCHAR))
          AND (CAST(:from AS TIMESTAMP)  IS NULL OR created_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP)  IS NULL OR created_at <= CAST(:to   AS TIMESTAMP))
        ORDER BY created_at DESC
    """, nativeQuery = true,
         countQuery = """
        SELECT COUNT(*) FROM audit_logs
        WHERE (CAST(:username AS VARCHAR) IS NULL OR LOWER(username) LIKE LOWER(CONCAT('%', CAST(:username AS VARCHAR), '%')))
          AND (CAST(:action   AS VARCHAR) IS NULL OR action = CAST(:action AS VARCHAR))
          AND (CAST(:from AS TIMESTAMP)  IS NULL OR created_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP)  IS NULL OR created_at <= CAST(:to   AS TIMESTAMP))
    """)
    Page<AuditLog> findFiltered(
            @Param("username") String username,
            @Param("action")   String action,
            @Param("from")     LocalDateTime from,
            @Param("to")       LocalDateTime to,
            Pageable pageable
    );
}