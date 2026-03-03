package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UnitRepository extends JpaRepository<Unit, Long> {

    List<Unit> findAllByIsActiveTrue();

    boolean existsBySymbolIgnoreCase(String symbol);

    Optional<Unit> findBySymbolIgnoreCase(String symbol);
}
