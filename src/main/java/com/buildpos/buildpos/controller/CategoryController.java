package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.entity.Category;
import com.buildpos.buildpos.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // GET /api/categories
    @GetMapping
    public ResponseEntity<List<Category>> getAll() {
        return ResponseEntity.ok(categoryService.getAll());
    }

    // GET /api/categories/main
    @GetMapping("/main")
    public ResponseEntity<List<Category>> getMain() {
        return ResponseEntity.ok(categoryService.getMainCategories());
    }

    // POST /api/categories
    @PostMapping
    public ResponseEntity<Category> create(@RequestBody Category category) {
        return ResponseEntity.ok(categoryService.create(category));
    }
}