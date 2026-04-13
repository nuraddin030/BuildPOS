package com.buildpos.buildpos.security;

import com.buildpos.buildpos.exception.BadRequestException;

/**
 * B-13 — Parol murakkablik talablari:
 * - Minimal 8 belgi
 * - Kamida 1 ta katta harf (A-Z)
 * - Kamida 1 ta kichik harf (a-z)
 * - Kamida 1 ta raqam (0-9)
 */
public final class PasswordValidator {

    private static final int MIN_LENGTH = 8;

    private PasswordValidator() {}

    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new BadRequestException("Parol kamida " + MIN_LENGTH + " ta belgidan iborat bo'lishi kerak");
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            throw new BadRequestException("Parolda kamida 1 ta katta harf bo'lishi kerak");
        }
        if (!password.chars().anyMatch(Character::isLowerCase)) {
            throw new BadRequestException("Parolda kamida 1 ta kichik harf bo'lishi kerak");
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            throw new BadRequestException("Parolda kamida 1 ta raqam bo'lishi kerak");
        }
    }
}