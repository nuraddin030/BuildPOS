package com.buildpos.buildpos.service;

import com.buildpos.buildpos.exception.BadRequestException;
import jakarta.servlet.http.HttpServletRequest;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class FileUploadService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${server.port:8080}")
    private String serverPort;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    private static final long MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // ── Dinamik base URL — so'rov kelgan IP dan olinadi ──────────
    private String getBaseUrl() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String scheme = request.getScheme();             // http
                String host   = request.getServerName();         // 192.168.x.x yoki localhost
                int    port   = request.getServerPort();         // 8080
                if ((scheme.equals("http")  && port == 80) ||
                        (scheme.equals("https") && port == 443)) {
                    return scheme + "://" + host;
                }
                return scheme + "://" + host + ":" + port;
            }
        } catch (Exception ignored) {}
        return "http://localhost:" + serverPort;
    }

    public String uploadImage(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Fayl bo'sh");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Faqat rasm fayllari qabul qilinadi (JPEG, PNG, WebP)");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BadRequestException("Fayl hajmi 10MB dan oshmasligi kerak");
        }

        try {
            Path uploadPath = Paths.get(uploadDir, "products");
            Files.createDirectories(uploadPath);

            String filename = UUID.randomUUID().toString() + ".jpg";
            File outputFile = uploadPath.resolve(filename).toFile();

            Thumbnails.of(file.getInputStream())
                    .size(800, 800)
                    .keepAspectRatio(true)
                    .outputFormat("jpg")
                    .outputQuality(0.85)
                    .toFile(outputFile);

            return getBaseUrl() + "/uploads/products/" + filename;

        } catch (IOException e) {
            throw new BadRequestException("Rasmni saqlashda xatolik: " + e.getMessage());
        }
    }
}