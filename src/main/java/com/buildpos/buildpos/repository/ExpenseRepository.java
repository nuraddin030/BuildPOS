package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query(value = """
            SELECT * FROM expenses
            WHERE (CAST(:from AS DATE) IS NULL OR date >= CAST(:from AS DATE))
              AND (CAST(:to   AS DATE) IS NULL OR date <= CAST(:to   AS DATE))
              AND (CAST(:categoryId AS BIGINT) IS NULL OR category_id = CAST(:categoryId AS BIGINT))
            ORDER BY date DESC, created_at DESC
            """, nativeQuery = true)
    List<Expense> findFiltered(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("categoryId") Long categoryId
    );

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.date = :date")
    BigDecimal sumByDate(@Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.shift.id = :shiftId")
    BigDecimal sumByShift(@Param("shiftId") Long shiftId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.date >= :from AND e.date <= :to")
    BigDecimal sumByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}