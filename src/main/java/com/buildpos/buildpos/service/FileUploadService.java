package com.buildpos.buildpos.service;

import com.buildpos.buildpos.exception.BadRequestException;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
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

    @Value("${app.upload.base-url:http://localhost:8080}")
    private String baseUrl;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    private static final long MAX_SIZE = 10 * 1024 * 1024; // 10MB

    public String uploadImage(MultipartFile file) {
        // Tekshirish
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
            // Papka yaratish
            Path uploadPath = Paths.get(uploadDir, "products");
            Files.createDirectories(uploadPath);

            // Fayl nomi
            String filename = UUID.randomUUID().toString() + ".jpg";
            File outputFile = uploadPath.resolve(filename).toFile();

            // Siqish va o'lchamini kamaytirish
            // Max 800x800, sifat 0.85 (85%) — taxminan 50-150KB bo'ladi
            Thumbnails.of(file.getInputStream())
                    .size(800, 800)
                    .keepAspectRatio(true)
                    .outputFormat("jpg")
                    .outputQuality(0.85)
                    .toFile(outputFile);

            return baseUrl + "/uploads/products/" + filename;

        } catch (IOException e) {
            throw new BadRequestException("Rasmni saqlashda xatolik: " + e.getMessage());
        }
    }
}
