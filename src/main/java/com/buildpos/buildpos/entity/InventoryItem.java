package com.buildpos.buildpos.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "inventory_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InventorySession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_unit_id", nullable = false)
    private ProductUnit productUnit;

    @Column(name = "product_name", nullable = false, length = 500)
    private String productName;

    @Column(name = "unit_symbol", nullable = false, length = 20)
    private String unitSymbol;

    @Column(name = "system_qty", nullable = false, precision = 18, scale = 3)
    private BigDecimal systemQty = BigDecimal.ZERO;

    @Column(name = "actual_qty", precision = 18, scale = 3)
    private BigDecimal actualQty;

    @Column(length = 500)
    private String notes;
}