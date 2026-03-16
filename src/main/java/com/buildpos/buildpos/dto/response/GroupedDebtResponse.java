package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class GroupedDebtResponse {

    // Mijoz yoki Yetkazuvchi
    private Long entityId;
    private String entityName;
    private String entityPhone;

    // Aggregate
    private BigDecimal totalDebt;       // Jami dastlabki qarz
    private BigDecimal totalRemaining;  // Jami qoldiq
    private Integer openCount;          // Ochiq qarzlar soni
    private Integer overdueCount;       // Muddati o'tgan soni

    // Ichki qarzlar ro'yxati
    private List<CustomerDebtResponse> debts;      // mijoz uchun
    private List<SupplierDebtResponse> supplierDebts; // yetkazuvchi uchun
}
