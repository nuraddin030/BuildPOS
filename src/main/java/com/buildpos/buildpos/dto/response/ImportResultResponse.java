package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImportResultResponse {

    private int totalRows;
    private int successCount;
    private int errorCount;

    /**
     * Xatoliklar bo'lsa xato qatorlarni o'z ichiga olgan
     * Excel faylining Base64 kodlangan ko'rinishi.
     * Null bo'lishi mumkin (xato yo'q bo'lsa).
     */
    private String errorFileBase64;
}