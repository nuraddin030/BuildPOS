package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.InventorySession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventorySessionRepository extends JpaRepository<InventorySession, Long> {
    Page<InventorySession> findAllByOrderByCreatedAtAsc(Pageable pageable);
}