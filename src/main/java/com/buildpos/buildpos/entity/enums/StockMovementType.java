package com.buildpos.buildpos.entity.enums;

public enum StockMovementType {
    PURCHASE_IN,     // Yetkazib beruvchidan kirim
    SALE_OUT,        // Sotuvdan chiqim
    ADJUSTMENT_IN,   // Qo'lda kirim (inventarizatsiya)
    ADJUSTMENT_OUT,  // Qo'lda chiqim
    TRANSFER_OUT,    // Ombordan chiqim (transfer)
    TRANSFER_IN,     // Omborgа kirim (transfer)
    RETURN_IN        // Qaytarib olish
}
