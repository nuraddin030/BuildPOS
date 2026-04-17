package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.SupplierPaymentRequest;
import com.buildpos.buildpos.dto.response.SupplierDebtResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.entity.PaymentMethod;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SupplierPaymentService {

    private final SupplierPaymentRepository supplierPaymentRepository;
    private final SupplierRepository        supplierRepository;
    private final SupplierDebtRepository    supplierDebtRepository;
    private final ExpenseRepository         expenseRepository;
    private final ExpenseCategoryRepository categoryRepository;
    private final ShiftRepository           shiftRepository;
    private final UserRepository            userRepository;

    // ─────────────────────────────────────────
    // YANGI: Ko'p usulda to'lov + smena harajati
    // ─────────────────────────────────────────
    @Transactional
    public SupplierDebtResponse payDebt(SupplierPaymentRequest req, String username) {
        SupplierDebt debt = supplierDebtRepository.findById(req.getDebtId())
                .orElseThrow(() -> new NotFoundException("Qarz topilmadi: " + req.getDebtId()));

        if (debt.getIsPaid()) {
            throw new BadRequestException("Bu qarz allaqachon to'langan");
        }

        BigDecimal cash     = coalesce(req.getCashAmount());
        BigDecimal card     = coalesce(req.getCardAmount());
        BigDecimal transfer = coalesce(req.getTransferAmount());
        BigDecimal total    = cash.add(card).add(transfer);

        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("To'lov summasi kiritilmagan");
        }

        BigDecimal remaining = debt.getAmount().subtract(debt.getPaidAmount());
        if (total.compareTo(remaining) > 0) {
            throw new BadRequestException("To'lov summasi qoldiq qarzdan ko'p");
        }

        User user = userRepository.findByUsername(username).orElse(null);
        Supplier supplier = debt.getSupplier();
        LocalDateTime now = LocalDateTime.now();

        // ── SupplierPayment yozuvlari (har usul uchun) ───────────
        if (cash.compareTo(BigDecimal.ZERO) > 0) {
            savePayment(supplier, cash, PaymentMethod.CASH, req.getNotes(), user, now);
        }
        if (card.compareTo(BigDecimal.ZERO) > 0) {
            savePayment(supplier, card, PaymentMethod.CARD, req.getNotes(), user, now);
        }
        if (transfer.compareTo(BigDecimal.ZERO) > 0) {
            savePayment(supplier, transfer, PaymentMethod.TRANSFER, req.getNotes(), user, now);
        }

        // ── SupplierDebt paidAmount yangilash ─────────────────────
        debt.setPaidAmount(debt.getPaidAmount().add(total));
        if (debt.getPaidAmount().compareTo(debt.getAmount()) >= 0) {
            debt.setIsPaid(true);
        }
        supplierDebtRepository.save(debt);

        // ── Smena harajati (agar belgilangan bo'lsa) ─────────────
        Shift shift = null;
        if (user != null) {
            shift = shiftRepository.findByCashierIdAndStatus(user.getId(), ShiftStatus.OPEN)
                    .or(() -> shiftRepository.findFirstByStatus(ShiftStatus.OPEN))
                    .orElse(null);
        }

        if (shift != null) {
            ExpenseCategory category = getOrCreateSupplierCategory();
            String noteText = "Yetkazuvchi: " + supplier.getName()
                    + (req.getNotes() != null && !req.getNotes().isBlank() ? " | " + req.getNotes() : "");

            saveExpenseIfPositive(coalesce(req.getExpenseCash()),
                    com.buildpos.buildpos.entity.enums.PaymentMethod.CASH,
                    shift, category, supplier.getId(), noteText, user);
            saveExpenseIfPositive(coalesce(req.getExpenseCard()),
                    com.buildpos.buildpos.entity.enums.PaymentMethod.CARD,
                    shift, category, supplier.getId(), noteText, user);
            saveExpenseIfPositive(coalesce(req.getExpenseTransfer()),
                    com.buildpos.buildpos.entity.enums.PaymentMethod.TRANSFER,
                    shift, category, supplier.getId(), noteText, user);
        }

        // ── Response qaytarish ────────────────────────────────────
        return toDebtResponse(supplierDebtRepository.findById(debt.getId()).orElse(debt));
    }

    // ─────────────────────────────────────────
    // ESKI (backward compat): oddiy to'lov
    // ─────────────────────────────────────────
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
                "totalDebt",  totalDebt,
                "totalPaid",  totalPaid,
                "remaining",  remaining
        );
    }

    // ─────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────
    private void savePayment(Supplier supplier, BigDecimal amount,
                             PaymentMethod method, String notes,
                             User user, LocalDateTime now) {
        supplierPaymentRepository.save(SupplierPayment.builder()
                .supplier(supplier)
                .amount(amount)
                .paymentMethod(method)
                .note(notes)
                .paidAt(now)
                .paidBy(user)
                .createdAt(now)
                .build());
    }

    private void saveExpenseIfPositive(BigDecimal amount,
                                       com.buildpos.buildpos.entity.enums.PaymentMethod method,
                                       Shift shift, ExpenseCategory category,
                                       Long supplierId, String note, User user) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
        expenseRepository.save(Expense.builder()
                .date(LocalDate.now())
                .category(category)
                .amount(amount)
                .paymentMethod(method)
                .supplierId(supplierId)
                .note(note)
                .shift(shift)
                .createdBy(user)
                .build());
    }

    private ExpenseCategory getOrCreateSupplierCategory() {
        return categoryRepository.findByName("Yetkazuvchiga to'lov")
                .orElseGet(() -> categoryRepository.save(
                        ExpenseCategory.builder().name("Yetkazuvchiga to'lov").build()));
    }

    private BigDecimal coalesce(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
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