package com.buildpos.buildpos.entity;

import com.buildpos.buildpos.entity.enums.DiscountType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sale_items")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_unit_id", nullable = false)
    private ProductUnit productUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;        // qaysi ombordan

    @Column(nullable = false, precision = 18, scale = 3)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal originalPrice;   // mahsulotning asl narxi

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal salePrice;       // kassir o'zgartirgan narx

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal minPrice;        // o'sha paytdagi min_price (tarix uchun)

    // Item chegirmasi
    @Enumerated(EnumType.STRING)
    private DiscountType discountType;

    @Column(precision = 18, scale = 2)
    private BigDecimal discountValue = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal totalPrice;      // (salePrice - discountAmount) * quantity

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
