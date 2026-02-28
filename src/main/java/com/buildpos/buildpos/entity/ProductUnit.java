package com.buildpos.buildpos.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "product_units",
        uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "unit_id"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private Unit unit;

    @Column(nullable = false)
    private Boolean isDefault = false;  // asosiy o'lchov birligi

    @Column(unique = true)
    private String barcode;             // har unit uchun alohida barcode

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal costPrice = BigDecimal.ZERO;   // tannarx

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal salePrice = BigDecimal.ZERO;   // sotuv narxi

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal minPrice = BigDecimal.ZERO;    // minimal sotuv narxi

    @Column(nullable = false)
    private Boolean isActive = true;

    // Price tiers (miqdor va rol asosida narxlar)
    @OneToMany(mappedBy = "productUnit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProductPriceTier> priceTiers = new ArrayList<>();

    // Warehouse stock
    @OneToMany(mappedBy = "productUnit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<WarehouseStock> warehouseStocks = new ArrayList<>();

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", updatable = false)
    private User createdBy;

    @LastModifiedBy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
}
