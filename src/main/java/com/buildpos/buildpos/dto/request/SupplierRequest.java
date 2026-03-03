package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SupplierRequest {

    @NotBlank(message = "Yetkazuvchi nomi bo'sh bo'lishi mumkin emas")
    @Size(max = 200)
    private String name;

    @Size(max = 200)
    private String company;

    @Size(max = 20)
    private String phone;

    @Size(max = 300)
    private String address;

    @Size(max = 50)
    private String bankAccount;

    @Size(max = 20)
    private String inn;

    private String notes;
}