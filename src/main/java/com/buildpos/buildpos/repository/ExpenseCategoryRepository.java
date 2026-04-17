package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {
    List<ExpenseCategory> findAllByOrderByNameAsc();
    Optional<ExpenseCategory> findByName(String name);
}