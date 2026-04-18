-- Excel importda costPriceUsd ga tushib qolgan UZS narxlarni costPrice ga ko'chirish.
-- Belgi: exchange_rate_at_save IS NULL AND cost_price = 0 AND cost_price_usd IS NOT NULL
UPDATE product_units
SET cost_price     = cost_price_usd,
    cost_price_usd = NULL
WHERE cost_price_usd IS NOT NULL
  AND cost_price = 0
  AND exchange_rate_at_save IS NULL;
