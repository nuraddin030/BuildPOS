package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    @Modifying
    @Query("DELETE FROM SaleItem si WHERE si.sale.id = :saleId")
    void deleteAllBySaleId(Long saleId);
}