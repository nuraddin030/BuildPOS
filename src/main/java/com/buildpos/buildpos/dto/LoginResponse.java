package com.buildpos.buildpos.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;          // Access token (15 daqiqa)
    private String refreshToken;   // Refresh token (7 kun)
    private String username;
    private String role;
    private String fullName;
}