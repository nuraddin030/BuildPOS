package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.ExpenseResponse;
import com.buildpos.buildpos.entity.Expense;
import com.buildpos.buildpos.entity.ExpenseCategory;
import com.buildpos.buildpos.entity.Shift;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.repository.ExpenseCategoryRepository;
import com.buildpos.buildpos.repository.ExpenseRepository;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import com.buildpos.buildpos.repository.ShiftRepository;
import com.buildpos.buildpos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExpenseService {

    private final ExpenseRepository expenseRepo;
    private final ExpenseCategoryRepository categoryRepo;
    private final UserRepository userRepo;
    private final ShiftRepository shiftRepo;

    public List<ExpenseCategory> getCategories() {
        return categoryRepo.findAllByOrderByNameAsc();
    }

    @Transactional
    public ExpenseCategory createCategory(String name) {
        return categoryRepo.save(ExpenseCategory.builder().name(name).build());
    }

    @Transactional
    public void deleteCategory(Long id) {
        categoryRepo.deleteById(id);
    }

    public List<ExpenseResponse> getExpenses(LocalDate from, LocalDate to, Long categoryId) {
        return expenseRepo.findFiltered(from, to, categoryId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public ExpenseResponse create(LocalDate date, Long categoryId, BigDecimal amount, String note) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElse(null);

        ExpenseCategory category = categoryId != null
                ? categoryRepo.findById(categoryId).orElse(null) : null;

        // Ochiq smenani topamiz
        Shift shift = null;
        if (user != null) {
            shift = shiftRepo.findByCashierIdAndStatus(user.getId(), ShiftStatus.OPEN).orElse(null);
        }

        Expense expense = Expense.builder()
                .date(date != null ? date : LocalDate.now())
                .category(category)
                .amount(amount)
                .note(note)
                .createdBy(user)
                .shift(shift)
                .build();

        return toDto(expenseRepo.save(expense));
    }

    @Transactional
    public void delete(Long id) {
        expenseRepo.deleteById(id);
    }

    public BigDecimal getTodayTotal() {
        return expenseRepo.sumByDate(LocalDate.now());
    }

    public BigDecimal getShiftTotal(Long shiftId) {
        return expenseRepo.sumByShift(shiftId);
    }

    private ExpenseResponse toDto(Expense e) {
        return ExpenseResponse.builder()
                .id(e.getId())
                .date(e.getDate())
                .categoryId(e.getCategory() != null ? e.getCategory().getId() : null)
                .categoryName(e.getCategory() != null ? e.getCategory().getName() : "—")
                .amount(e.getAmount())
                .note(e.getNote())
                .createdByName(e.getCreatedBy() != null ? e.getCreatedBy().getFullName() : "—")
                .createdAt(e.getCreatedAt())
                .build();
    }
}