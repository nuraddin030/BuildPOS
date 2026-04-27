package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
@Tag(name = "Upload", description = "Fayl yuklash")
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/image")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAnyAuthority('PRODUCTS_CREATE', 'PRODUCTS_EDIT')")
    @Operation(summary = "Rasm yuklash — ikki versiyada (1000x1000 + 200x200 thumbnail)")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(fileUploadService.uploadImage(file));
    }
}