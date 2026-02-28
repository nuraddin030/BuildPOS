package com.buildpos.buildpos.entity;

import com.buildpos.buildpos.entity.enums.ShiftStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "shifts")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id", nullable = false)
    private User cashier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShiftStatus status = ShiftStatus.OPEN;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal openingCash = BigDecimal.ZERO;   // smena boshlanganda kassadagi naqd

    @Column(precision = 18, scale = 2)
    private BigDecimal closingCash;                     // smena yopilganda haqiqiy naqd

    // Smena hisoboti (yopilganda to'ldiriladi)
    @Column(precision = 18, scale = 2)
    private BigDecimal totalSales = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal totalCash = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal totalCard = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal totalTransfer = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal totalDebt = BigDecimal.ZERO;

    private Integer saleCount = 0;

    @Column(nullable = false)
    private LocalDateTime openedAt;

    private LocalDateTime closedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
