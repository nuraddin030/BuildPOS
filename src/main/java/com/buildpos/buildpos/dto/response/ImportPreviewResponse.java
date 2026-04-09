package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class ImportPreviewResponse {

    /** Excel faylidagi ustun nomlari (0-indexed) */
    private List<String> headers;

    /** Birinchi 5 ta qator (namuna) */
    private List<List<String>> sampleRows;

    /**
     * Avtomatik aniqlangan mapping:
     * key   = tizim maydoni nomi (name, categoryName, unitName, ...)
     * value = ustun indeksi (0-based), -1 = topilmadi
     */
    private Map<String, Integer> autoMapping;

    /** Jami ma'lumot qatorlar soni (sarlavhasiz) */
    private int totalDataRows;
}