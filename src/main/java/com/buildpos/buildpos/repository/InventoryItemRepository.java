package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findAllBySessionIdOrderByProductNameAsc(Long sessionId);
}