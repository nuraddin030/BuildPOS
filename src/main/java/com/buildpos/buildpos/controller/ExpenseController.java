package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.ExpenseResponse;
import com.buildpos.buildpos.entity.ExpenseCategory;
import com.buildpos.buildpos.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses", description = "Harajatlar")
public class ExpenseController {

    private final ExpenseService service;

    // ── Kategoriyalar ────────────────────────────────────────────
    @GetMapping("/categories")
    @Operation(summary = "Barcha kategoriyalar")
    public List<ExpenseCategory> getCategories() {
        return service.getCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Kategoriya qo'shish")
    public ExpenseCategory createCategory(@RequestBody Map<String, String> body) {
        return service.createCategory(body.get("name"));
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Kategoriya o'chirish")
    public void deleteCategory(@PathVariable Long id) {
        service.deleteCategory(id);
    }

    // ── Harajatlar ───────────────────────────────────────────────
    @GetMapping
    @Operation(summary = "Harajatlar ro'yxati")
    public List<ExpenseResponse> getAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long categoryId
    ) {
        return service.getExpenses(from, to, categoryId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Harajat qo'shish")
    public ExpenseResponse create(@RequestBody Map<String, Object> body) {
        LocalDate date = body.get("date") != null
                ? LocalDate.parse(body.get("date").toString()) : null;
        Long categoryId = body.get("categoryId") != null
                ? Long.valueOf(body.get("categoryId").toString()) : null;
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String note = body.get("note") != null ? body.get("note").toString() : null;
        return service.create(date, categoryId, amount, note);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Harajat o'chirish")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/today-total")
    @Operation(summary = "Bugungi harajatlar jami")
    public Map<String, Object> todayTotal() {
        return Map.of("total", service.getTodayTotal());
    }

    @GetMapping("/shift/{shiftId}/total")
    @Operation(summary = "Smena bo'yicha harajatlar jami")
    public Map<String, Object> shiftTotal(@PathVariable Long shiftId) {
        return Map.of("total", service.getShiftTotal(shiftId));
    }
}