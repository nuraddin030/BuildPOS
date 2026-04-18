package com.buildpos.buildpos.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;      // Access token (15 daqiqa) — JS memory da saqlanadi
    private String username;
    private String role;
    private String fullName;
    // refreshToken endi HttpOnly cookie orqali yuboriladi — JS dan ko'rinmaydi
}