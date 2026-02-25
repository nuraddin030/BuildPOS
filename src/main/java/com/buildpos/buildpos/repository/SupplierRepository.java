package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByIsActiveTrue();
    List<Supplier> findByNameContainingIgnoreCase(String name);
}