package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.entity.SupplierPayment;
import com.buildpos.buildpos.service.SupplierPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/supplier-payments")
@RequiredArgsConstructor
public class SupplierPaymentController {

    private final SupplierPaymentService supplierPaymentService;

    // POST /api/supplier-payments — to'lov qilish
    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<SupplierPayment> pay(@RequestBody SupplierPayment payment) {
        return ResponseEntity.ok(supplierPaymentService.pay(payment));
    }

    // GET /api/supplier-payments/supplier/{id} — to'lovlar tarixi
    @GetMapping("/supplier/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<List<SupplierPayment>> getPayments(@PathVariable Long id) {
        return ResponseEntity.ok(supplierPaymentService.getPayments(id));
    }

    // GET /api/supplier-payments/summary/{id} — jami qarz/to'langan/qoldiq
    @GetMapping("/summary/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<Map<String, Object>> getSummary(@PathVariable Long id) {
        return ResponseEntity.ok(supplierPaymentService.getSummary(id));
    }
}
