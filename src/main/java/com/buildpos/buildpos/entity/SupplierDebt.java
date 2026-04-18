package com.buildpos.buildpos.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "supplier_debts")
@EntityListeners(AuditingEntityListener.class)
public class SupplierDebt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    // Purchase bilan bog'liq (ixtiyoriy)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id")
    private Purchase purchase;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "paid_amount")
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "UZS";

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "is_paid")
    private Boolean isPaid = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}