package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.ProductUnit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductUnitRepository extends JpaRepository<ProductUnit, Long> {

    List<ProductUnit> findAllByProductId(Long productId);

    Optional<ProductUnit> findByBarcode(String barcode);

    boolean existsByBarcodeAndIdNot(String barcode, Long id);

    Optional<ProductUnit> findByProductIdAndIsDefaultTrue(Long productId);

    Optional<ProductUnit> findByProductIdAndIsBaseUnitTrue(Long productId);

    List<ProductUnit> findAllByUnitId(Long unitId);
}