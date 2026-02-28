package com.buildpos.buildpos.entity;

import com.buildpos.buildpos.entity.enums.PriceTierType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_price_tiers")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductPriceTier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_unit_id", nullable = false)
    private ProductUnit productUnit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PriceTierType tierType;    // QUANTITY yoki ROLE

    // Miqdor asosida (tierType = QUANTITY)
    @Column(precision = 18, scale = 3)
    private BigDecimal minQuantity;    // 10 dan

    @Column(precision = 18, scale = 3)
    private BigDecimal maxQuantity;    // 50 gacha (null = cheksiz)

    // Rol asosida (tierType = ROLE)
    private String roleName;           // WHOLESALE, VIP, RETAIL

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @CreatedBy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", updatable = false)
    private User createdBy;
}