package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.request.TelegramSubscriberRequest;
import com.buildpos.buildpos.dto.response.TelegramSubscriberResponse;
import com.buildpos.buildpos.service.TelegramSubscriberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settings/telegram")
@RequiredArgsConstructor
@Tag(name = "Settings", description = "Sozlamalar")
public class TelegramSubscriberController {

    private final TelegramSubscriberService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Barcha Telegram obunachilari")
    public List<TelegramSubscriberResponse> getAll() {
        return service.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Yangi obunachi qo'shish")
    public TelegramSubscriberResponse create(@RequestBody @Valid TelegramSubscriberRequest req) {
        return service.create(req);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Kutayotgan so'rovlar")
    public List<TelegramSubscriberResponse> getPending() {
        return service.getPending();
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "So'rovni tasdiqlash")
    public TelegramSubscriberResponse approve(@PathVariable Long id) {
        return service.approve(id);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "So'rovni rad etish")
    public TelegramSubscriberResponse reject(@PathVariable Long id) {
        return service.reject(id);
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Faol/Nofaol o'tkazish")
    public TelegramSubscriberResponse toggle(@PathVariable Long id) {
        return service.toggleActive(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "O'chirish")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}