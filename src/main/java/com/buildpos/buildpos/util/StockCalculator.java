package com.buildpos.buildpos.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * WarehouseStock quantity operatsiyalari uchun utility.
 * Barcha hisob-kitoblar scale=3, HALF_UP bilan bajariladi.
 */
public class StockCalculator {

    private static final int SCALE = 3;
    private static final RoundingMode MODE = RoundingMode.HALF_UP;

    public static BigDecimal normalize(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO.setScale(SCALE, MODE);
        return value.setScale(SCALE, MODE);
    }

    public static BigDecimal add(BigDecimal base, BigDecimal delta) {
        return normalize(base).add(normalize(delta));
    }

    public static BigDecimal subtract(BigDecimal base, BigDecimal delta) {
        return normalize(base).subtract(normalize(delta));
    }

    public static boolean isEnough(BigDecimal stock, BigDecimal required) {
        return normalize(stock).compareTo(normalize(required)) >= 0;
    }
}