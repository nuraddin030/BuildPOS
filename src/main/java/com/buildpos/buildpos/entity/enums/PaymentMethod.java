package com.buildpos.buildpos.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PaymentMethod {
    CASH("Naqd"),
    CARD("Karta"),
    TRANSFER("O'tkazma"),
    DEBT("Nasiya");

    private final String label;
}
