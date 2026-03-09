package com.buildpos.buildpos.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PurchaseRequest {

    @NotNull(message = "Supplier tanlanishi kerak")
    private Long supplierId;

    @NotNull(message = "Ombor tanlanishi kerak")
    private Long warehouseId;

    @NotEmpty(message = "Kamida bitta mahsulot bo'lishi kerak")
    @Valid
    private List<PurchaseItemRequest> items;

    private String notes;
    private LocalDateTime expectedAt;

    // ─────────────────────────────────────────
    // Xarid tarkibidagi bitta mahsulot
    // ─────────────────────────────────────────
    @Data
    public static class PurchaseItemRequest {

        @NotNull(message = "Mahsulot unit ID bo'sh bo'lmasligi kerak")
        private Long productUnitId;

        @NotNull
        @DecimalMin(value = "0.001", message = "Miqdor 0 dan katta bo'lishi kerak")
        private BigDecimal quantity;

        @NotNull
        @DecimalMin(value = "0.0", message = "Narx manfiy bo'lmasligi kerak")
        private BigDecimal unitPrice;

        @Pattern(regexp = "^(UZS|USD)$", message = "Valyuta UZS yoki USD bo'lishi kerak")
        private String currency = "UZS";

        private BigDecimal exchangeRate;  // USD bo'lsa kurs kiritiladi
    }
}