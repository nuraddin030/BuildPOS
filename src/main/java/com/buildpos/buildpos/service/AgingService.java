package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.AgingResponse;
import com.buildpos.buildpos.repository.CustomerDebtRepository;
import com.buildpos.buildpos.repository.SupplierDebtRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgingService {

    private final CustomerDebtRepository customerDebtRepository;
    private final SupplierDebtRepository supplierDebtRepository;

    public AgingResponse getCustomerAging() {
        return buildAging(customerDebtRepository.findAllOpenForAging());
    }

    public AgingResponse getSupplierAging() {
        return buildAging(supplierDebtRepository.findAllOpenForAging());
    }

    private AgingResponse buildAging(List<Object[]> rows) {
        BigDecimal total0_30   = BigDecimal.ZERO;
        BigDecimal total31_60  = BigDecimal.ZERO;
        BigDecimal total61_90  = BigDecimal.ZERO;
        BigDecimal total90plus = BigDecimal.ZERO;

        int count0_30 = 0, count31_60 = 0, count61_90 = 0, count90plus = 0;

        List<AgingResponse.AgingItem> items = new ArrayList<>();

        for (Object[] row : rows) {
            Long   entityId      = ((Number) row[1]).longValue();
            String entityName    = (String) row[2];
            String entityPhone   = (String) row[3];
            BigDecimal remaining = new BigDecimal(row[6].toString());
            int    days          = ((Number) row[8]).intValue();

            String bucket, color;
            if (days <= 30) {
                bucket = "0-30";  color = "#16a34a";
                total0_30   = total0_30.add(remaining);   count0_30++;
            } else if (days <= 60) {
                bucket = "31-60"; color = "#f59e0b";
                total31_60  = total31_60.add(remaining);  count31_60++;
            } else if (days <= 90) {
                bucket = "61-90"; color = "#f97316";
                total61_90  = total61_90.add(remaining);  count61_90++;
            } else {
                bucket = "90+";   color = "#dc2626";
                total90plus = total90plus.add(remaining); count90plus++;
            }

            items.add(AgingResponse.AgingItem.builder()
                    .entityId(entityId)
                    .entityName(entityName)
                    .entityPhone(entityPhone)
                    .remainingAmount(remaining)
                    .daysOverdue(days)
                    .bucket(bucket)
                    .color(color)
                    .build());
        }

        return AgingResponse.builder()
                .bucket0_30(AgingResponse.AgingBucket.builder()
                        .label("0–30 kun").totalAmount(total0_30).count(count0_30).color("#16a34a").build())
                .bucket31_60(AgingResponse.AgingBucket.builder()
                        .label("31–60 kun").totalAmount(total31_60).count(count31_60).color("#f59e0b").build())
                .bucket61_90(AgingResponse.AgingBucket.builder()
                        .label("61–90 kun").totalAmount(total61_90).count(count61_90).color("#f97316").build())
                .bucket90plus(AgingResponse.AgingBucket.builder()
                        .label("90+ kun").totalAmount(total90plus).count(count90plus).color("#dc2626").build())
                .items(items)
                .build();
    }
}