package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CustomerRequest {

    @NotBlank(message = "Mijoz ismi bo'sh bo'lmasligi kerak")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Telefon raqam bo'sh bo'lmasligi kerak")
    @Size(max = 20)
    private String phone;

    private String notes;
    // Qarz limiti
    private BigDecimal debtLimit;           // NULL = limit yo'q

    private Boolean debtLimitStrict = false; // true = bloklash, false = ogohlantirish
}
