package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ReturnRequest {

    @NotEmpty(message = "Kamida bitta mahsulot qaytarilishi kerak")
    private List<ReturnItem> items;

    private String reason; // qaytarish sababi

    @Data
    public static class ReturnItem {

        @NotNull
        private Long saleItemId;

        @NotNull
        @Positive(message = "Miqdor musbat bo'lishi kerak")
        private BigDecimal quantity; // qaytariladigan miqdor (original dan kam yoki teng)
    }
}
