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

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5MB

    /**
     * Magic bytes tekshiruvi — fayl boshidagi imzo (signature) orqali
     * haqiqiy rasm ekanligini tasdiqlaydi.
     * Content-Type header soxtalashtirish mumkin, lekin magic bytes yo'q.
     */
    private void validateMagicBytes(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length < 4) {
                throw new BadRequestException("Fayl noto'g'ri formatda");
            }
            // JPEG: FF D8 FF
            if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF) return;
            // PNG: 89 50 4E 47
            if (bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) return;
            // GIF: 47 49 46 38
            if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38) return;
            // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
            if (bytes.length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                    && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) return;

            throw new BadRequestException("Fayl haqiqiy rasm emas");
        } catch (IOException e) {
            throw new BadRequestException("Faylni o'qishda xatolik");
        }
    }

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
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Faqat rasm fayllari qabul qilinadi (JPEG, PNG, WebP, GIF)");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BadRequestException("Fayl hajmi 5MB dan oshmasligi kerak");
        }
        // Magic bytes tekshiruvi — Content-Type spoofing oldini olish
        validateMagicBytes(file);

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