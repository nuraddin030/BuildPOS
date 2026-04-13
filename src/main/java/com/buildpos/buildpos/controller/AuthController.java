package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.LoginRequest;
import com.buildpos.buildpos.dto.LoginResponse;
import com.buildpos.buildpos.entity.RefreshToken;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.repository.UserRepository;
import com.buildpos.buildpos.security.JwtUtil;
import com.buildpos.buildpos.service.RefreshTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Autentifikatsiya")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/login")
    @Operation(summary = "Tizimga kirish")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByUsername(request.getUsername()).orElseThrow();

        String accessToken  = jwtUtil.generateToken(user.getUsername(), user.getRole().getName());
        RefreshToken refresh = refreshTokenService.create(user);

        return ResponseEntity.ok(new LoginResponse(
                accessToken,
                refresh.getToken(),
                user.getUsername(),
                user.getRole().getName(),
                user.getFullName()
        ));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Access tokenni yangilash")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refreshTokenStr = body.get("refreshToken");
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "refreshToken majburiy"));
        }

        return refreshTokenService.validate(refreshTokenStr)
                .map(rt -> {
                    User user = rt.getUser();
                    String newAccessToken = jwtUtil.generateToken(
                            user.getUsername(), user.getRole().getName());
                    return ResponseEntity.ok(Map.of("token", newAccessToken));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Refresh token yaroqsiz yoki muddati o'tgan")));
    }

    @PostMapping("/logout")
    @Operation(summary = "Tizimdan chiqish")
    public ResponseEntity<Void> logout(HttpServletRequest request,
                                       @RequestBody(required = false) Map<String, String> body) {
        // Access tokenni blacklist ga qo'shish
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwtUtil.invalidate(header.substring(7));
        }
        // Refresh tokenni bekor qilish
        if (body != null && body.containsKey("refreshToken")) {
            refreshTokenService.revoke(body.get("refreshToken"));
        }
        return ResponseEntity.noContent().build();
    }
}