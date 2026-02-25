package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.Product;
import com.buildpos.buildpos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    // Barcha faol mahsulotlar (Kassada ko'rsatish uchun)
    public List<Product> getActiveProducts() {
        return productRepository.findByIsActiveTrue();
    }

    // Barcode bo'yicha qidirish (Skaner uchun)
    public Optional<Product> findByBarcode(String barcode) {
        return productRepository.findByBarcode(barcode);
    }

    // Nom bo'yicha qidirish (POS qidiruv uchun)
    public List<Product> searchByName(String name) {
        return productRepository.findByNameContainingIgnoreCaseAndIsActiveTrue(name);
    }

    // Kategoriya bo'yicha
    public List<Product> getByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId);
    }

    // Yangi mahsulot yaratish
    public Product create(Product product) {
        return productRepository.save(product);
    }

    // ID bo'yicha topish
    public Optional<Product> findById(Long id) {
        return productRepository.findById(id);
    }

    // Mahsulotni yangilash
    public Product update(Product product) {
        return productRepository.save(product);
    }
}