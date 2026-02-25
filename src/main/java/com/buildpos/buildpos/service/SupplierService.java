package com.buildpos.buildpos.service;

import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierDebtRepository supplierDebtRepository;

    // Barcha faol yetkazuvchilar
    public List<Supplier> getAll() {
        return supplierRepository.findByIsActiveTrue();
    }

    // Qidirish
    public List<Supplier> search(String name) {
        return supplierRepository.findByNameContainingIgnoreCase(name);
    }

    // ID bo'yicha
    public Optional<Supplier> findById(Long id) {
        return supplierRepository.findById(id);
    }

    // Yaratish
    @Transactional
    public Supplier create(Supplier supplier) {
        supplier.setCreatedAt(java.time.LocalDateTime.now());
        supplier.setUpdatedAt(java.time.LocalDateTime.now());
        return supplierRepository.save(supplier);
    }

    // Yangilash
    @Transactional
    public Supplier update(Supplier supplier) {
        supplier.setUpdatedAt(java.time.LocalDateTime.now());
        return supplierRepository.save(supplier);
    }

    // Qarzlar
    public List<SupplierDebt> getDebts(Long supplierId) {
        return supplierDebtRepository.findBySupplierId(supplierId);
    }

    // Jami qarz
    public BigDecimal getTotalDebt(Long supplierId) {
        return supplierDebtRepository.getTotalDebtBySupplierId(supplierId);
    }

    // O'chirish
    @Transactional
    public void delete(Long id) {
        supplierRepository.deleteById(id);
    }

    // To'lanmagan qarzlar (barcha yetkazuvchilar)
    public List<SupplierDebt> getAllUnpaidDebts() {
        return supplierDebtRepository.findByIsPaidFalse();
    }
}
