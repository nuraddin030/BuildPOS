package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.LoginRequest;
import com.buildpos.buildpos.dto.LoginResponse;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.repository.UserRepository;
import com.buildpos.buildpos.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {

        // Username va parolni tekshirish
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        // Foydalanuvchi ma'lumotlarini olish
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow();

        // Token yaratish
        String token = jwtUtil.generateToken(
                user.getUsername(),
                user.getRole().getName()
        );

        return ResponseEntity.ok(new LoginResponse(
                token,
                user.getUsername(),
                user.getRole().getName(),
                user.getFullName()
        ));
    }
}
