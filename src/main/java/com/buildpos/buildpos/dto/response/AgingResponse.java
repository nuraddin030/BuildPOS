package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class AgingResponse {

    // Umumiy statistika (4 bucket)
    private AgingBucket bucket0_30;
    private AgingBucket bucket31_60;
    private AgingBucket bucket61_90;
    private AgingBucket bucket90plus;

    // Har bir qarz detail
    private List<AgingItem> items;

    @Data
    @Builder
    public static class AgingBucket {
        private String label;           // "0-30 kun"
        private BigDecimal totalAmount; // Jami summa
        private Integer count;          // Qarzlar soni
        private String color;           // UI uchun rang
    }

    @Data
    @Builder
    public static class AgingItem {
        private Long   entityId;
        private String entityName;
        private String entityPhone;
        private BigDecimal remainingAmount;
        private Integer daysOverdue;
        private String bucket;          // "0-30" | "31-60" | "61-90" | "90+"
        private String color;
    }
}
