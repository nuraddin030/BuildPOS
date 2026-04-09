package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.dto.response.ImportPreviewResponse;
import com.buildpos.buildpos.dto.response.ImportResultResponse;
import com.buildpos.buildpos.service.ProductImportService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/products/import")
@RequiredArgsConstructor
@Tag(name = "Product Import", description = "Mahsulotlarni Excel fayldan import qilish")
public class ProductImportController {

    private final ProductImportService importService;
    private final ObjectMapper objectMapper;

    @GetMapping("/template")
    @Operation(summary = "Excel shablonini yuklab olish")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        byte[] bytes = importService.generateTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mahsulotlar_shablon.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Fayl preview — ustunlarni aniqlash")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('PRODUCTS_CREATE')")
    public ResponseEntity<ImportPreviewResponse> preview(
            @RequestPart("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(importService.preview(file));
    }

    @PostMapping(value = "/execute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Import bajarish")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STOREKEEPER') or hasAuthority('PRODUCTS_CREATE')")
    public ResponseEntity<ImportResultResponse> execute(
            @RequestPart("file") MultipartFile file,
            @RequestPart("mapping") String mappingJson,
            @RequestPart(value = "warehouseId", required = false) String warehouseIdStr) throws IOException {
        Map<String, Integer> mapping = objectMapper.readValue(
                mappingJson, new TypeReference<Map<String, Integer>>() {});
        Long warehouseId = (warehouseIdStr != null && !warehouseIdStr.isBlank())
                ? Long.parseLong(warehouseIdStr) : null;
        return ResponseEntity.ok(importService.execute(file, mapping, warehouseId));
    }
}