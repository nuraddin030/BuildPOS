package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.ExchangeRate;
import com.buildpos.buildpos.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private final ExchangeRateRepository exchangeRateRepository;

    public BigDecimal getCurrentRate() {
        return exchangeRateRepository.findLatestUSD()
                .map(ExchangeRate::getRate)
                .orElse(BigDecimal.valueOf(12700));
    }

    @Transactional
    public BigDecimal updateRate(BigDecimal newRate) {
        ExchangeRate rate = ExchangeRate.builder()
                .currency("USD")
                .rate(newRate)
                .build();
        exchangeRateRepository.save(rate);
        return newRate;
    }
}