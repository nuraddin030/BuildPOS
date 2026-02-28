package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UnitRequest {

    @NotBlank(message = "O'lchov birligi nomi bo'sh bo'lmasligi kerak")
    @Size(max = 50, message = "Nom 50 ta belgidan oshmasligi kerak")
    private String name;       // "Kilogram", "Pochka", "Quti"

    @NotBlank(message = "Belgi bo'sh bo'lmasligi kerak")
    @Size(max = 10, message = "Belgi 10 ta belgidan oshmasligi kerak")
    private String symbol;     // "kg", "pochka", "quti"
}
