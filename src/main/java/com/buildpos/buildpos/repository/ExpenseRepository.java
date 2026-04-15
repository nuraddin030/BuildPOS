package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query("SELECT e FROM Expense e LEFT JOIN FETCH e.category LEFT JOIN FETCH e.createdBy " +
           "WHERE (:from IS NULL OR e.date >= :from) AND (:to IS NULL OR e.date <= :to) " +
           "AND (:categoryId IS NULL OR e.category.id = :categoryId) " +
           "ORDER BY e.date DESC, e.createdAt DESC")
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