package com.buildpos.buildpos.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_debt_installments")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDebtInstallment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_debt_id", nullable = false)
    private CustomerDebt customerDebt;

    @Column(nullable = false)
    private Integer installmentNumber;      // 1, 2, 3, ...

    @Column(nullable = false)
    private LocalDate dueDate;              // To'lov sanasi

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;              // Rejalashtirilgan summa

    @Column(nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isPaid = false;

    private LocalDateTime paidAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}