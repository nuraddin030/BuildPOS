package com.buildpos.buildpos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Username bo'sh bo'lmasligi kerak")
    @Size(max = 50)
    private String username;

    @NotBlank(message = "Parol bo'sh bo'lmasligi kerak")
    @Size(min = 4, max = 100)
    private String password;
}