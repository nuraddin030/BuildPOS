package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.SupplierPayment;
import com.buildpos.buildpos.repository.SupplierPaymentRepository;
import com.buildpos.buildpos.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import com.buildpos.buildpos.repository.SupplierDebtRepository;


@Service
@RequiredArgsConstructor
public class SupplierPaymentService {

    private final SupplierPaymentRepository supplierPaymentRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierDebtRepository supplierDebtRepository;


    // To'lov qilish
    @Transactional
    public SupplierPayment pay(SupplierPayment payment) {
        payment.setPaidAt(LocalDateTime.now());
        payment.setCreatedAt(LocalDateTime.now());
        return supplierPaymentRepository.save(payment);
    }

    // Supplier to'lovlar tarixi
    public List<SupplierPayment> getPayments(Long supplierId) {
        return supplierPaymentRepository.findBySupplierIdOrderByPaidAtDesc(supplierId);
    }

    // Summary: jami qarz, to'langan, qoldiq
    public Map<String, Object> getSummary(Long supplierId) {
        BigDecimal totalDebt = supplierDebtRepository.getTotalDebtBySupplierId(supplierId);
        if (totalDebt == null) totalDebt = BigDecimal.ZERO;

        BigDecimal totalPaid = supplierPaymentRepository.getTotalPaidBySupplierId(supplierId);
        if (totalPaid == null) totalPaid = BigDecimal.ZERO;

        BigDecimal remaining = totalDebt.subtract(totalPaid);

        return Map.of(
                "supplierId", supplierId,
                "totalDebt", totalDebt,
                "totalPaid", totalPaid,
                "remaining", remaining
        );
    }
}