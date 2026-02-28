package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PartnerRequest {

    @NotBlank(message = "Hamkor ismi bo'sh bo'lmasligi kerak")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Telefon raqam bo'sh bo'lmasligi kerak")
    @Size(max = 20)
    private String phone;

    private String notes;
}
