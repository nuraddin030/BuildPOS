package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.ProductPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductPriceHistoryRepository extends JpaRepository<ProductPriceHistory, Long> {
    List<ProductPriceHistory> findAllByProductUnitIdOrderByChangedAtDesc(Long productUnitId);
}