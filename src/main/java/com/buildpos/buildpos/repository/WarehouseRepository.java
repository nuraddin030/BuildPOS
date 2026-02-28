package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

    List<Warehouse> findAllByIsActiveTrue();

    Optional<Warehouse> findByIsDefaultTrue();
}
