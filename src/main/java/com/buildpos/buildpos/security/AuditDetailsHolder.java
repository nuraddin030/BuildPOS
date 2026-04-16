package com.buildpos.buildpos.security;

/**
 * HTTP so'rovi davomida audit tafsilotlarini uzatish uchun ThreadLocal.
 * Service qatlami details ni belgilaydi → AuditLogFilter o'qib saqlanadi.
 */
public class AuditDetailsHolder {

    private static final ThreadLocal<String> HOLDER = new ThreadLocal<>();

    public static void set(String details) {
        HOLDER.set(details);
    }

    public static String get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}