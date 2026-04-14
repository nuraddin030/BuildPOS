package com.buildpos.buildpos.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TelegramSubscriberResponse {
    private Long id;
    private String name;
    private String chatId;
    private Boolean isActive;
    private String note;
    private LocalDateTime createdAt;
}