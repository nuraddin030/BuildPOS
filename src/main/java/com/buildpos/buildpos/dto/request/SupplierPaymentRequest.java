package com.buildpos.buildpos.dto.request;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class SupplierPaymentRequest {

    private Long debtId;
    private Long supplierId;

    // Yetkazuvchiga to'langan summalar (to'lov usuli bo'yicha)
    private BigDecimal cashAmount;
    private BigDecimal cardAmount;
    private BigDecimal transferAmount;

    // Shu smenaga harajat sifatida yoziladigan summalar
    private BigDecimal expenseCash;
    private BigDecimal expenseCard;
    private BigDecimal expenseTransfer;

    private String notes;
}