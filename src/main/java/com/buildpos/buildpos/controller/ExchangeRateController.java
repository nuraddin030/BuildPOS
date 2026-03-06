package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.service.ExchangeRateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/exchange-rate")
@RequiredArgsConstructor
@Tag(name = "Exchange Rate", description = "Valyuta kursi boshqaruvi")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    @GetMapping("/current")
    @Operation(summary = "Joriy dollar kursini olish")
    public ResponseEntity<Map<String, Object>> getCurrent() {
        BigDecimal rate = exchangeRateService.getCurrentRate();
        return ResponseEntity.ok(Map.of("currency", "USD", "rate", rate));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi dollar kursini o'rnatish")
    public ResponseEntity<Map<String, Object>> update(@RequestBody Map<String, BigDecimal> body) {
        BigDecimal newRate = body.get("rate");
        exchangeRateService.updateRate(newRate);
        return ResponseEntity.ok(Map.of("currency", "USD", "rate", newRate));
    }
}