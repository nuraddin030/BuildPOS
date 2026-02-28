package com.buildpos.buildpos.entity;

import com.buildpos.buildpos.entity.enums.PermissionType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "permissions")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private PermissionGroup group;

    @Column(nullable = false, unique = true)
    private String name;        // PAGE_PRODUCTS, PRODUCT_CREATE, ...

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PermissionType type; // PAGE, ACTION

    @Column(nullable = false)
    private String labelUz;     // Mahsulotlar sahifasi

    @Column(nullable = false)
    private String labelEn;     // Products page

    private Integer sortOrder = 0;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @CreatedBy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", updatable = false)
    private User createdBy;
}
