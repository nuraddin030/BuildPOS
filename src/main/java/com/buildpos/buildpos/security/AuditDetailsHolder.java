package com.buildpos.buildpos.security;

/**
 * HTTP so'rovi davomida audit tafsilotlarini uzatish uchun ThreadLocal.
 * Service qatlami details ni belgilaydi → AuditLogFilter o'qib saqlanadi.
 */
public class AuditDetailsHolder {

    private static final ThreadLocal<String> DETAILS     = new ThreadLocal<>();
    private static final ThreadLocal<String> ENTITY_NAME = new ThreadLocal<>();

    public static void set(String details) {
        DETAILS.set(details);
    }

    public static void setEntityName(String name) {
        ENTITY_NAME.set(name);
    }

    public static String get() {
        return DETAILS.get();
    }

    public static String getEntityName() {
        return ENTITY_NAME.get();
    }

    public static void clear() {
        DETAILS.remove();
        ENTITY_NAME.remove();
    }
}