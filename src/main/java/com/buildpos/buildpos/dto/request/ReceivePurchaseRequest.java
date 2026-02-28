package com.buildpos.buildpos.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ReceivePurchaseRequest {

    @Valid
    private List<ReceiveItemRequest> items;  // null bo'lsa — hammasi to'liq qabul

    private String notes;

    @Data
    public static class ReceiveItemRequest {

        @NotNull
        private Long purchaseItemId;

        @NotNull
        @DecimalMin(value = "0.001")
        private BigDecimal receivedQty;
    }
}
