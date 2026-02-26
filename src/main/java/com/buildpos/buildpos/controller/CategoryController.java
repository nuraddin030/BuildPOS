package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.CategoryReorderRequest;
import com.buildpos.buildpos.dto.request.CategoryRequest;
import com.buildpos.buildpos.dto.response.BreadcrumbItem;
import com.buildpos.buildpos.dto.response.CategoryResponse;
import com.buildpos.buildpos.dto.response.CategoryStatsResponse;
import com.buildpos.buildpos.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    public ResponseEntity<CategoryResponse> create(
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(request));
    }

    @GetMapping
    public ResponseEntity<Page<CategoryResponse>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "position") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(categoryService.getAll(keyword, pageable));
    }

    @GetMapping("/tree")
    public ResponseEntity<List<CategoryResponse>> getTree() {
        return ResponseEntity.ok(categoryService.getTree());
    }

    @GetMapping("/stats")
    public ResponseEntity<CategoryStatsResponse> getStats() {
        return ResponseEntity.ok(categoryService.getStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getById(id));
    }

    @GetMapping("/{id}/breadcrumb")
    public ResponseEntity<List<BreadcrumbItem>> getBreadcrumb(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getBreadcrumb(id));
    }

    @GetMapping("/{id}/subcategories")
    public ResponseEntity<List<CategoryResponse>> getSubcategories(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getSubcategories(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.update(id, request));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<CategoryResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.toggleStatus(id));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<CategoryResponse> move(
            @PathVariable Long id,
            @RequestParam(required = false) Long newParentId) {
        return ResponseEntity.ok(categoryService.move(id, newParentId));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorder(@RequestBody List<CategoryReorderRequest> requests) {
        categoryService.reorder(requests);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}