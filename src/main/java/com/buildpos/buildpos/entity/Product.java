package com.buildpos.buildpos.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    // Many-to-One: Ko'p mahsulot → 1 kategoriya
    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(unique = true, length = 50)
    private String barcode;

    @Column(name = "image_path", length = 500)
    private String imagePath;

    @Column(name = "sale_price", nullable = false)
    private BigDecimal salePrice;

    @Column(name = "min_price", nullable = false)
    private BigDecimal minPrice;

    @Column(name = "min_stock")
    private Integer minStock = 0;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}