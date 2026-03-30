package com.buildpos.buildpos.entity.enums;

public enum SaleStatus {
    DRAFT,      // Savatcha yaratildi, stock kamaygan
    PENDING,    // Tasdiqlashga yuborildi (yordamchi → ega)
    HOLD,       // Kechiktirilgan (stock hali kamaygan)
    COMPLETED,  // Yakunlangan
    CANCELLED,  // Bekor qilingan, stock qaytgan
    RETURNED    // Qaytarilgan (to'liq yoki qisman)
}

