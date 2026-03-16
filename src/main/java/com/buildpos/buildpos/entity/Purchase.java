package com.buildpos.buildpos.entity;

import com.buildpos.buildpos.entity.enums.PurchaseStatus;
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
@Table(name = "purchases")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Purchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String referenceNo;        // PUR-20250101-0001

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PurchaseStatus status = PurchaseStatus.PENDING;

    // ── Legacy (UZS qism, backward compat) ──
    @Column(nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal debtAmount = BigDecimal.ZERO;

    // ── Multi-currency: USD va UZS alohida ──
    @Column(name = "total_usd", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalUsd = BigDecimal.ZERO;

    @Column(name = "total_uzs", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalUzs = BigDecimal.ZERO;

    @Column(name = "paid_usd", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal paidUsd = BigDecimal.ZERO;

    @Column(name = "paid_uzs", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal paidUzs = BigDecimal.ZERO;

    @Column(name = "debt_usd", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal debtUsd = BigDecimal.ZERO;

    @Column(name = "debt_uzs", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal debtUzs = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDateTime expectedAt;   // kutilgan yetkazib berish sanasi
    private LocalDateTime receivedAt;   // haqiqiy qabul sanasi

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PurchaseItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PurchasePayment> payments = new ArrayList<>();

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