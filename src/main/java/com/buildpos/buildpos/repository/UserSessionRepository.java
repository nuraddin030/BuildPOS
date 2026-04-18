package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.UserSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    // Foydalanuvchining oxirgi ochiq sessiyasi (logout_at IS NULL)
    Optional<UserSession> findTopByUsernameAndLogoutAtIsNullOrderByLoginAtDesc(String username);

    // Barcha ochiq sessiyalar (logoutAt IS NULL)
    @Query("SELECT s FROM UserSession s WHERE s.logoutAt IS NULL")
    java.util.List<UserSession> findAllOpen();

    // Filter: username, sana oralig'i
    @Query(value = """
        SELECT * FROM user_sessions
        WHERE (CAST(:username AS VARCHAR) IS NULL
               OR LOWER(username) LIKE LOWER(CONCAT('%', CAST(:username AS VARCHAR), '%')))
          AND (CAST(:from AS TIMESTAMP) IS NULL OR login_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP) IS NULL OR login_at <= CAST(:to   AS TIMESTAMP))
        ORDER BY login_at DESC
    """, nativeQuery = true,
    countQuery = """
        SELECT COUNT(*) FROM user_sessions
        WHERE (CAST(:username AS VARCHAR) IS NULL
               OR LOWER(username) LIKE LOWER(CONCAT('%', CAST(:username AS VARCHAR), '%')))
          AND (CAST(:from AS TIMESTAMP) IS NULL OR login_at >= CAST(:from AS TIMESTAMP))
          AND (CAST(:to   AS TIMESTAMP) IS NULL OR login_at <= CAST(:to   AS TIMESTAMP))
    """)
    Page<UserSession> findFiltered(
            @Param("username") String username,
            @Param("from")     LocalDateTime from,
            @Param("to")       LocalDateTime to,
            Pageable pageable
    );
}