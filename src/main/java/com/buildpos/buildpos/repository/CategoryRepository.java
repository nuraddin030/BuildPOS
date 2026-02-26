package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    @Query("SELECT c FROM Category c WHERE c.isDeleted = false ORDER BY c.position ASC")
    Page<Category> findAllActive(Pageable pageable);

    @Query("""
            SELECT c FROM Category c
            WHERE c.isDeleted = false
              AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(c.slug) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY c.position ASC
            """)
    Page<Category> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT c FROM Category c WHERE c.parent IS NULL AND c.isDeleted = false ORDER BY c.position ASC")
    List<Category> findAllRootCategories();

    @Query("SELECT c FROM Category c WHERE c.parent.id = :parentId AND c.isDeleted = false ORDER BY c.position ASC")
    List<Category> findAllByParentId(@Param("parentId") Long parentId);

    boolean existsBySlugAndIsDeletedFalse(String slug);

    @Query("SELECT c FROM Category c WHERE c.id = :id AND c.isDeleted = false")
    Optional<Category> findActiveById(@Param("id") Long id);

    @Query("SELECT COUNT(c) FROM Category c WHERE c.isDeleted = false")
    Long countAllActive();

    @Query("SELECT COUNT(c) FROM Category c WHERE c.isDeleted = false AND c.status = 'ACTIVE'")
    Long countByStatusActive();

    @Query("SELECT COUNT(c) FROM Category c WHERE c.isDeleted = false AND c.parent IS NULL")
    Long countRootCategories();
}