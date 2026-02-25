package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Barcode bo'yicha qidirish (POS uchun)
    Optional<Product> findByBarcode(String barcode);

    // Kategoriya bo'yicha
    List<Product> findByCategoryId(Long categoryId);

    // Faqat faol mahsulotlar
    List<Product> findByIsActiveTrue();

    // Nom bo'yicha qidirish (POS qidirish uchun)
    List<Product> findByNameContainingIgnoreCaseAndIsActiveTrue(String name);
}