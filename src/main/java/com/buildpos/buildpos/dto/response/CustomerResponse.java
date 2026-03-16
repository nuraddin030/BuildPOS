package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CustomerResponse {

    private Long id;
    private String name;
    private String phone;
    private String notes;
    private Boolean isActive;
    // Qarz ma'lumotlari
    private BigDecimal totalDebt;           // Hozirgi jami qarz

    // Qarz limiti
    private BigDecimal debtLimit;           // NULL = limit yo'q
    private Boolean debtLimitStrict;        // true = bloklash, false = ogohlantirish
    private Boolean limitExceeded;          // totalDebt > debtLimit
    private BigDecimal limitRemaining;      // debtLimit - totalDebt (manfiy bo'lishi mumkin)

    private LocalDateTime createdAt;
}