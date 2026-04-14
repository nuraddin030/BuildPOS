package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.TelegramSubscriber;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TelegramSubscriberRepository extends JpaRepository<TelegramSubscriber, Long> {

    List<TelegramSubscriber> findAllByIsActiveTrueOrderByCreatedAtDesc();

    List<TelegramSubscriber> findAllByOrderByCreatedAtDesc();

    Optional<TelegramSubscriber> findByChatId(String chatId);

    boolean existsByChatId(String chatId);
}