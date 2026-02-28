package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PartnerResponse {

    private Long id;
    private String name;
    private String phone;
    private String notes;
    private Boolean isActive;
    private LocalDateTime createdAt;

    // Statistika
    private Long totalSaleCount;           // Jami sotuv soni
    private BigDecimal totalSaleAmount;    // Jami sotuv summasi
    private BigDecimal avgSaleAmount;      // O'rtacha sotuv summasi
    private Long totalCustomerCount;       // Olib kelgan mijozlar soni
    private Long paidSaleCount;            // To'liq to'langan sotuvlar
    private Long debtSaleCount;            // Nasiya sotuvlar
    private LocalDateTime lastSaleAt;      // Oxirgi sotuv sanasi
    private String bestMonth;             // Eng ko'p sotuv qilgan oy (yyyy-MM)
}
