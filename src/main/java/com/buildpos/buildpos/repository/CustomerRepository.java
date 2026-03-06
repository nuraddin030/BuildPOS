package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

// ─────────────────────────────────────────────────────────────
// CustomerRepository
// ─────────────────────────────────────────────────────────────
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByPhone(String phone);

    Optional<Customer> findByPhone(String phone);

    @Query(value = """
    SELECT * FROM customers c
    WHERE (:search IS NULL
        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
        OR LOWER(CAST(c.phone AS text)) LIKE LOWER(CONCAT('%', :search, '%')))
      AND c.is_active = true
""", countQuery = """
    SELECT COUNT(*) FROM customers c
    WHERE (:search IS NULL
        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
        OR LOWER(CAST(c.phone AS text)) LIKE LOWER(CONCAT('%', :search, '%')))
      AND c.is_active = true
""", nativeQuery = true)
    Page<Customer> findAllFiltered(@Param("search") String search, Pageable pageable);
}
