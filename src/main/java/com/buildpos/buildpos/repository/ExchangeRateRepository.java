package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {
    @Query("SELECT e FROM ExchangeRate e WHERE e.currency = 'USD' ORDER BY e.createdAt DESC LIMIT 1")
    Optional<ExchangeRate> findLatestUSD();
}
