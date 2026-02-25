package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.Category;
import com.buildpos.buildpos.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    // Barcha asosiy kategoriyalar
    public List<Category> getMainCategories() {
        return categoryRepository.findByParentIsNull();
    }

    // Pastcategoriyalar
    public List<Category> getChildren(Long parentId) {
        return categoryRepository.findByParentId(parentId);
    }

    // Yangi kategoriya yaratish
    public Category create(Category category) {
        return categoryRepository.save(category);
    }

    // Barcha kategoriyalar
    public List<Category> getAll() {
        return categoryRepository.findAll();
    }
}