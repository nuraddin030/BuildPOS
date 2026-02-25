package com.buildpos.buildpos.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    // O'z-o'ziga bog'lanish (pastcategoriya uchun)
    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Category parent;

    // Bu kategoriyaning pastcategoriyalari
    @OneToMany(mappedBy = "parent")
    private List<Category> children;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}