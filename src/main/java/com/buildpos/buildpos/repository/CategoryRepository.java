package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    // Parent_id = null bo'lganlar = asosiy kategoriyalar
    List<Category> findByParentIsNull();

    // Pastcategoriyalar
    List<Category> findByParentId(Long parentId);
}