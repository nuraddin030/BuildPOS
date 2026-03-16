package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.InstallmentResponse;
import com.buildpos.buildpos.entity.CustomerDebt;
import com.buildpos.buildpos.entity.CustomerDebtInstallment;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.CustomerDebtRepository;
import com.buildpos.buildpos.repository.InstallmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstallmentService {

    private final InstallmentRepository installmentRepository;
    private final CustomerDebtRepository customerDebtRepository;

    // ─────────────────────────────────────────
    // TO'LOV JADVALI OLISH
    // ─────────────────────────────────────────
    public List<InstallmentResponse> getByDebt(Long debtId) {
        return installmentRepository
                .findByCustomerDebtIdOrderByInstallmentNumberAsc(debtId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // AVTOMATIK JADVAL YARATISH
    // months     — necha oyga bo'linadi
    // startDate  — birinchi to'lov sanasi
    // ─────────────────────────────────────────
    @Transactional
    public List<InstallmentResponse> generate(Long debtId, int months, LocalDate startDate) {
        if (months < 1 || months > 120)
            throw new BadRequestException("Oylar soni 1 dan 120 gacha bo'lishi kerak");
        if (startDate == null)
            startDate = LocalDate.now().plusMonths(1).withDayOfMonth(1);

        CustomerDebt debt = findDebt(debtId);
        if (debt.getIsPaid())
            throw new BadRequestException("To'langan qarz uchun jadval yaratib bo'lmaydi");

        BigDecimal remaining = debt.getAmount().subtract(debt.getPaidAmount());
        if (remaining.compareTo(BigDecimal.ZERO) <= 0)
            throw new BadRequestException("Qarz to'liq to'langan");

        // Mavjud jadvalni o'chirib yangi yarataмiz
        installmentRepository.deleteByCustomerDebtId(debtId);

        BigDecimal perMonth   = remaining.divide(BigDecimal.valueOf(months), 2, RoundingMode.FLOOR);
        BigDecimal lastAmount = remaining.subtract(perMonth.multiply(BigDecimal.valueOf(months - 1)));

        List<CustomerDebtInstallment> installments = new ArrayList<>();
        for (int i = 1; i <= months; i++) {
            installments.add(CustomerDebtInstallment.builder()
                    .customerDebt(debt)
                    .installmentNumber(i)
                    .dueDate(startDate.plusMonths(i - 1))
                    .amount(i == months ? lastAmount : perMonth)
                    .build());
        }

        return installmentRepository.saveAll(installments)
                .stream().map(this::toResponse).toList();
    }

    // ─────────────────────────────────────────
    // QO'LDA JADVAL SAQLASH (frontend dan to'liq ro'yxat keladi)
    // ─────────────────────────────────────────
    @Transactional
    public List<InstallmentResponse> saveCustom(Long debtId, List<Map<String, Object>> items) {
        CustomerDebt debt = findDebt(debtId);
        if (debt.getIsPaid())
            throw new BadRequestException("To'langan qarz uchun jadval yaratib bo'lmaydi");

        BigDecimal remaining = debt.getAmount().subtract(debt.getPaidAmount());
        BigDecimal total = items.stream()
                .map(item -> new BigDecimal(String.valueOf(item.get("amount"))))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (total.compareTo(remaining) > 0)
            throw new BadRequestException("Jadvaldagi jami summa qarz qoldiqdan oshib ketdi: " + remaining);

        installmentRepository.deleteByCustomerDebtId(debtId);

        List<CustomerDebtInstallment> installments = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            Map<String, Object> item = items.get(i);
            installments.add(CustomerDebtInstallment.builder()
                    .customerDebt(debt)
                    .installmentNumber(i + 1)
                    .dueDate(LocalDate.parse(String.valueOf(item.get("dueDate"))))
                    .amount(new BigDecimal(String.valueOf(item.get("amount"))))
                    .notes(item.get("notes") != null ? String.valueOf(item.get("notes")) : null)
                    .build());
        }

        return installmentRepository.saveAll(installments)
                .stream().map(this::toResponse).toList();
    }

    // ─────────────────────────────────────────
    // INSTALLMENT TO'LASH
    // ─────────────────────────────────────────
    @Transactional
    public InstallmentResponse pay(Long installmentId, BigDecimal amount, String notes) {
        CustomerDebtInstallment inst = installmentRepository.findById(installmentId)
                .orElseThrow(() -> new NotFoundException("Installment topilmadi: " + installmentId));

        if (inst.getIsPaid())
            throw new BadRequestException("Bu to'lov allaqachon amalga oshirilgan");

        BigDecimal remaining = inst.getAmount().subtract(inst.getPaidAmount());
        if (amount.compareTo(remaining) > 0)
            throw new BadRequestException("To'lov summasi qoldiqdan oshib ketdi: " + remaining);

        inst.setPaidAmount(inst.getPaidAmount().add(amount));
        inst.setIsPaid(inst.getPaidAmount().compareTo(inst.getAmount()) >= 0);
        if (inst.getIsPaid()) inst.setPaidAt(LocalDateTime.now());
        if (notes != null && !notes.isBlank()) inst.setNotes(notes);

        return toResponse(installmentRepository.save(inst));
    }

    // ─────────────────────────────────────────
    // JADVALNI O'CHIRISH
    // ─────────────────────────────────────────
    @Transactional
    public void delete(Long debtId) {
        findDebt(debtId);
        installmentRepository.deleteByCustomerDebtId(debtId);
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private CustomerDebt findDebt(Long id) {
        return customerDebtRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Qarz topilmadi: " + id));
    }

    private InstallmentResponse toResponse(CustomerDebtInstallment i) {
        BigDecimal remaining = i.getAmount().subtract(i.getPaidAmount());
        boolean isOverdue = !i.getIsPaid()
                && i.getDueDate().isBefore(LocalDate.now());
        return InstallmentResponse.builder()
                .id(i.getId())
                .customerDebtId(i.getCustomerDebt().getId())
                .installmentNumber(i.getInstallmentNumber())
                .dueDate(i.getDueDate())
                .amount(i.getAmount())
                .paidAmount(i.getPaidAmount())
                .remainingAmount(remaining)
                .isPaid(i.getIsPaid())
                .isOverdue(isOverdue)
                .paidAt(i.getPaidAt())
                .notes(i.getNotes())
                .createdAt(i.getCreatedAt())
                .build();
    }
}
