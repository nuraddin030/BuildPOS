package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WarehouseRequest {

    @NotBlank(message = "Ombor nomi bo'sh bo'lmasligi kerak")
    @Size(max = 100, message = "Nom 100 ta belgidan oshmasligi kerak")
    private String name;       // "Asosiy ombor", "Filial 1"

    @Size(max = 255, message = "Manzil 255 ta belgidan oshmasligi kerak")
    private String address;
}
