package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.PurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {

    List<PurchaseItem> findAllByPurchaseId(Long purchaseId);
}