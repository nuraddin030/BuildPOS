package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.SupplierRequest;
import com.buildpos.buildpos.dto.response.GroupedDebtResponse;
import com.buildpos.buildpos.dto.response.SupplierDebtResponse;
import com.buildpos.buildpos.dto.response.SupplierResponse;
import com.buildpos.buildpos.entity.Supplier;
import com.buildpos.buildpos.entity.SupplierDebt;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.SupplierDebtRepository;
import com.buildpos.buildpos.repository.SupplierRepository;
import com.buildpos.buildpos.security.AuditDetailsHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierDebtRepository supplierDebtRepository;

    // ─────────────────────────────────────────
    // GET ALL (faol)
    // ─────────────────────────────────────────
    public List<SupplierResponse> getAll() {
        return supplierRepository.findByIsActiveTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // QIDIRISH
    // ─────────────────────────────────────────
    public List<SupplierResponse> search(String name) {
        return supplierRepository.findByNameContainingIgnoreCase(name)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public SupplierResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // YARATISH
    // ─────────────────────────────────────────
    @Transactional
    public SupplierResponse create(SupplierRequest request) {
        Supplier supplier = Supplier.builder()
                .name(request.getName())
                .company(request.getCompany())
                .phone(request.getPhone())
                .address(request.getAddress())
                .bankAccount(request.getBankAccount())
                .inn(request.getInn())
                .notes(request.getNotes())
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        Supplier saved = supplierRepository.save(supplier);
        AuditDetailsHolder.setEntityName(saved.getName());
        return toResponse(saved);
    }

    // ─────────────────────────────────────────
    // YANGILASH
    // ─────────────────────────────────────────
    @Transactional
    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = findById(id);
        AuditDetailsHolder.setEntityName(supplier.getName());
        supplier.setName(request.getName());
        supplier.setCompany(request.getCompany());
        supplier.setPhone(request.getPhone());
        supplier.setAddress(request.getAddress());
        supplier.setBankAccount(request.getBankAccount());
        supplier.setInn(request.getInn());
        supplier.setNotes(request.getNotes());
        supplier.setUpdatedAt(LocalDateTime.now());
        return toResponse(supplierRepository.save(supplier));
    }

    // ─────────────────────────────────────────
    // O'CHIRISH (soft delete)
    // ─────────────────────────────────────────
    @Transactional
    public void delete(Long id) {
        Supplier supplier = findById(id);
        AuditDetailsHolder.setEntityName(supplier.getName());
        supplier.setIsActive(false);
        supplier.setUpdatedAt(LocalDateTime.now());
        supplierRepository.save(supplier);
    }

    // ─────────────────────────────────────────
    // QARZ TARIXI
    // ─────────────────────────────────────────
    public List<SupplierDebtResponse> getDebts(Long supplierId) {
        findById(supplierId); // mavjudligini tekshirish
        return supplierDebtRepository.findBySupplierId(supplierId)
                .stream()
                .map(this::toDebtResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // JAMI QARZ
    // ─────────────────────────────────────────
    public BigDecimal getTotalDebt(Long supplierId) {
        findById(supplierId);
        return supplierDebtRepository.getTotalDebtBySupplierId(supplierId);
    }

    // ─────────────────────────────────────────
    // TO'LANMAGAN QARZLAR (barcha yetkazuvchilar)
    // ─────────────────────────────────────────
    public List<SupplierDebtResponse> getAllUnpaidDebts() {
        return supplierDebtRepository.findByIsPaidFalse()
                .stream()
                .map(this::toDebtResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // TREE VIEW — yetkazuvchi bo'yicha guruhlangan ochiq qarzlar
    // ─────────────────────────────────────────
    public List<GroupedDebtResponse> getGroupedDebts(String search) {
        List<SupplierDebt> debts = supplierDebtRepository
                .findAllOpenForTree(search == null || search.isBlank() ? null : search);

        Map<Long, List<SupplierDebt>> grouped = new java.util.LinkedHashMap<>();
        for (SupplierDebt debt : debts) {
            grouped.computeIfAbsent(debt.getSupplier().getId(), k -> new java.util.ArrayList<>()).add(debt);
        }

        LocalDate today = LocalDate.now();
        return grouped.entrySet().stream().map(entry -> {
            List<SupplierDebt> supplierDebts = entry.getValue();
            SupplierDebt first = supplierDebts.get(0);

            BigDecimal totalDebt      = supplierDebts.stream().map(SupplierDebt::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRemaining = supplierDebts.stream().map(d -> d.getAmount().subtract(d.getPaidAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
            long overdueCount = supplierDebts.stream().filter(d -> d.getDueDate() != null && d.getDueDate().isBefore(today)).count();

            return GroupedDebtResponse.builder()
                    .entityId(first.getSupplier().getId())
                    .entityName(first.getSupplier().getName())
                    .entityPhone(first.getSupplier().getPhone())
                    .totalDebt(totalDebt)
                    .totalRemaining(totalRemaining)
                    .openCount(supplierDebts.size())
                    .overdueCount((int) overdueCount)
                    .supplierDebts(supplierDebts.stream().map(this::toDebtResponse).toList())
                    .build();
        }).toList();
    }

    // ─────────────────────────────────────────
    // BARCHA QARZLAR — DebtsPage uchun (filter + pagination)
    // ─────────────────────────────────────────
    public Page<SupplierDebtResponse> getAllDebts(String search, Boolean isPaid,
                                                  Boolean isOverdue, LocalDateTime from,
                                                  LocalDateTime to, Pageable pageable) {
        return supplierDebtRepository.findAllFiltered(search, isPaid, isOverdue, from, to, pageable)
                .map(this::toDebtResponse);
    }

    public Map<String, Object> getDebtStats() {
        LocalDate today = LocalDate.now();
        return Map.of(
                "totalRemaining", supplierDebtRepository.sumAllRemaining(),
                "openCount",      supplierDebtRepository.countAllOpen(),
                "overdueCount",   supplierDebtRepository.countAllOverdue(today)
        );
    }

    // ─────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────
    private Supplier findById(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Yetkazuvchi topilmadi: " + id));
    }

    private SupplierResponse toResponse(Supplier supplier) {
        BigDecimal totalDebt = supplierDebtRepository
                .getTotalDebtBySupplierId(supplier.getId());
        return SupplierResponse.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .company(supplier.getCompany())
                .phone(supplier.getPhone())
                .address(supplier.getAddress())
                .bankAccount(supplier.getBankAccount())
                .inn(supplier.getInn())
                .notes(supplier.getNotes())
                .isActive(supplier.getIsActive())
                .totalDebt(totalDebt)
                .createdAt(supplier.getCreatedAt())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }

    private SupplierDebtResponse toDebtResponse(SupplierDebt debt) {
        BigDecimal remaining = debt.getAmount().subtract(debt.getPaidAmount());
        boolean isOverdue = debt.getDueDate() != null
                && !debt.getIsPaid()
                && debt.getDueDate().isBefore(LocalDate.now());

        return SupplierDebtResponse.builder()
                .id(debt.getId())
                .supplierId(debt.getSupplier() != null ? debt.getSupplier().getId() : null)
                .supplierName(debt.getSupplier() != null ? debt.getSupplier().getName() : null)
                .supplierPhone(debt.getSupplier() != null ? debt.getSupplier().getPhone() : null)
                .purchaseId(debt.getPurchase() != null ? debt.getPurchase().getId() : null)
                .purchaseReferenceNo(debt.getPurchase() != null ? debt.getPurchase().getReferenceNo() : null)
                .amount(debt.getAmount())
                .paidAmount(debt.getPaidAmount())
                .remainingAmount(remaining)
                .dueDate(debt.getDueDate())
                .isPaid(debt.getIsPaid())
                .isOverdue(isOverdue)
                .notes(debt.getNotes())
                .createdAt(debt.getCreatedAt())
                .build();
    }
}