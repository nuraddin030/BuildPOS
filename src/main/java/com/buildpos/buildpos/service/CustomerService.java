package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.CustomerDebtPaymentRequest;
import com.buildpos.buildpos.dto.request.CustomerRequest;
import com.buildpos.buildpos.dto.response.CustomerResponse;
import com.buildpos.buildpos.entity.Customer;
import com.buildpos.buildpos.entity.CustomerDebt;
import com.buildpos.buildpos.entity.CustomerDebtPayment;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.exception.AlreadyExistsException;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.CustomerDebtRepository;
import com.buildpos.buildpos.repository.CustomerRepository;
import com.buildpos.buildpos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.buildpos.buildpos.dto.response.CustomerDebtResponse;
import com.buildpos.buildpos.dto.response.GroupedDebtResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerDebtRepository customerDebtRepository;
    private final UserRepository userRepository;

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @Transactional
    public CustomerResponse create(CustomerRequest request) {
        if (customerRepository.existsByPhone(request.getPhone())) {
            throw new AlreadyExistsException(
                    "Bu telefon raqam allaqachon ro'yxatda bor: " + request.getPhone()
            );
        }

        Customer customer = Customer.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .notes(request.getNotes())
                .isActive(true)
                .debtLimit(request.getDebtLimit())
                .debtLimitStrict(request.getDebtLimitStrict() != null ? request.getDebtLimitStrict() : false)
                .build();

        return toResponse(customerRepository.save(customer));
    }

    // ─────────────────────────────────────────
    // GET ALL
    // ─────────────────────────────────────────
    public Page<CustomerResponse> getAll(String search, Pageable pageable) {
        return customerRepository.findAllFiltered(search, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public CustomerResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // GET BY PHONE (kassir qidiruvi uchun)
    // ─────────────────────────────────────────
    public CustomerResponse getByPhone(String phone) {
        Customer customer = customerRepository.findByPhone(phone)
                .orElseThrow(() -> new NotFoundException("Mijoz topilmadi: " + phone));
        return toResponse(customer);
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = findById(id);

        if (!customer.getPhone().equals(request.getPhone()) &&
                customerRepository.existsByPhone(request.getPhone())) {
            throw new AlreadyExistsException(
                    "Bu telefon raqam allaqachon ro'yxatda bor: " + request.getPhone()
            );
        }

        customer.setName(request.getName());
        customer.setPhone(request.getPhone());
        customer.setNotes(request.getNotes());
        customer.setDebtLimit(request.getDebtLimit());
        customer.setDebtLimitStrict(request.getDebtLimitStrict() != null ? request.getDebtLimitStrict() : false);

        return toResponse(customerRepository.save(customer));
    }

    // ─────────────────────────────────────────
    // NASIYA TO'LASH
    // ─────────────────────────────────────────
    @Transactional
    public CustomerResponse payDebt(Long debtId, CustomerDebtPaymentRequest request,
                                    String username) {
        CustomerDebt debt = customerDebtRepository.findById(debtId)
                .orElseThrow(() -> new NotFoundException("Qarz topilmadi: " + debtId));

        if (debt.getIsPaid()) {
            throw new BadRequestException("Bu qarz allaqachon to'langan");
        }

        BigDecimal remaining = debt.getAmount().subtract(debt.getPaidAmount());
        if (request.getAmount().compareTo(remaining) > 0) {
            throw new BadRequestException(
                    "To'lov summasi qarzdan oshib ketdi. Qolgan qarz: " + remaining
            );
        }

        User paidBy = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi: " + username));

        // To'lov yozish
        CustomerDebtPayment payment = CustomerDebtPayment.builder()
                .customerDebt(debt)
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .notes(request.getNotes())
                .paidAt(request.getPaidAt() != null ? request.getPaidAt() : LocalDateTime.now())
                .paidBy(paidBy)
                .build();

        debt.getPayments().add(payment);

        // Qarz yangilash
        BigDecimal newPaid = debt.getPaidAmount().add(request.getAmount());
        debt.setPaidAmount(newPaid);
        debt.setIsPaid(newPaid.compareTo(debt.getAmount()) >= 0);

        customerDebtRepository.save(debt);

        return toResponse(debt.getCustomer());
    }

    // ─────────────────────────────────────────
    // TREE VIEW — mijoz bo'yicha guruhlangan ochiq qarzlar
    // ─────────────────────────────────────────
    public List<GroupedDebtResponse> getGroupedDebts(String search) {
        List<CustomerDebt> debts = customerDebtRepository
                .findAllOpenForTree(search == null || search.isBlank() ? null : search);

        // Mijoz bo'yicha guruhlash
        Map<Long, List<CustomerDebt>> grouped = new java.util.LinkedHashMap<>();
        for (CustomerDebt debt : debts) {
            grouped.computeIfAbsent(debt.getCustomer().getId(), k -> new java.util.ArrayList<>()).add(debt);
        }

        LocalDate today = LocalDate.now();
        return grouped.entrySet().stream().map(entry -> {
            List<CustomerDebt> customerDebts = entry.getValue();
            CustomerDebt first = customerDebts.get(0);

            BigDecimal totalDebt      = customerDebts.stream().map(CustomerDebt::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRemaining = customerDebts.stream().map(d -> d.getAmount().subtract(d.getPaidAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
            long overdueCount = customerDebts.stream().filter(d -> d.getDueDate() != null && d.getDueDate().isBefore(today)).count();

            return GroupedDebtResponse.builder()
                    .entityId(first.getCustomer().getId())
                    .entityName(first.getCustomer().getName())
                    .entityPhone(first.getCustomer().getPhone())
                    .totalDebt(totalDebt)
                    .totalRemaining(totalRemaining)
                    .openCount(customerDebts.size())
                    .overdueCount((int) overdueCount)
                    .debts(customerDebts.stream().map(this::toDebtResponse).toList())
                    .build();
        }).toList();
    }

    // ─────────────────────────────────────────
    // BARCHA QARZLAR — DebtsPage uchun (filter + pagination)
    // ─────────────────────────────────────────
    public Page<CustomerDebtResponse> getAllDebts(String search, Boolean isPaid,
                                                  Boolean isOverdue, LocalDateTime from,
                                                  LocalDateTime to, Pageable pageable) {
        return customerDebtRepository.findAllFiltered(search, isPaid, isOverdue, from, to, pageable)
                .map(this::toDebtResponse);
    }

    public Map<String, Object> getDebtStats() {
        LocalDate today = LocalDate.now();
        return Map.of(
                "totalRemaining", customerDebtRepository.sumAllRemaining(),
                "openCount",      customerDebtRepository.countAllOpen(),
                "overdueCount",   customerDebtRepository.countAllOverdue(today)
        );
    }

    // ─────────────────────────────────────────
    // QARZ MUDDATINI UZAYTIRISH
    // ─────────────────────────────────────────
    @Transactional
    public CustomerDebtResponse extendDebt(Long debtId, LocalDate newDueDate, String notes) {
        CustomerDebt debt = customerDebtRepository.findById(debtId)
                .orElseThrow(() -> new NotFoundException("Qarz topilmadi: " + debtId));

        if (debt.getIsPaid()) {
            throw new BadRequestException("To'langan qarzning muddatini uzaytirish mumkin emas");
        }
        if (newDueDate != null && newDueDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Yangi muddat bugundan katta bo'lishi kerak");
        }

        debt.setDueDate(newDueDate);
        if (notes != null && !notes.isBlank()) {
            String existing = debt.getNotes() != null ? debt.getNotes() + " | " : "";
            debt.setNotes(existing + "Muddat uzaytirildi: " + newDueDate + " (" + notes + ")");
        }

        return toDebtResponse(customerDebtRepository.save(debt));
    }

    // ─────────────────────────────────────────
    // QARZ TARIXI
    // ─────────────────────────────────────────
    public List<CustomerDebtResponse> getDebts(Long customerId) {
        findById(customerId); // mavjudligini tekshirish
        return customerDebtRepository.findAllByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(this::toDebtResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // QARZ LIMITI TEKSHIRUVI (CashierPage uchun)
    // ─────────────────────────────────────────
    public Map<String, Object> checkDebtLimit(Long customerId, BigDecimal newDebtAmount) {
        Customer customer = findById(customerId);
        BigDecimal totalDebt = customerDebtRepository.getTotalDebtByCustomerId(customerId);
        BigDecimal afterDebt = totalDebt.add(newDebtAmount);

        boolean hasLimit = customer.getDebtLimit() != null
                && customer.getDebtLimit().compareTo(BigDecimal.ZERO) > 0;

        if (!hasLimit) {
            return Map.of("allowed", true, "hasLimit", false);
        }

        boolean exceeded   = afterDebt.compareTo(customer.getDebtLimit()) > 0;
        boolean strict     = Boolean.TRUE.equals(customer.getDebtLimitStrict());
        BigDecimal remaining = customer.getDebtLimit().subtract(totalDebt);

        return Map.of(
                "allowed",       !exceeded || !strict,
                "hasLimit",      true,
                "exceeded",      exceeded,
                "strict",        strict,
                "debtLimit",     customer.getDebtLimit(),
                "currentDebt",   totalDebt,
                "remaining",     remaining,
                "afterDebt",     afterDebt
        );
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private Customer findById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Mijoz topilmadi: " + id));
    }

    private CustomerDebtResponse toDebtResponse(com.buildpos.buildpos.entity.CustomerDebt debt) {
        BigDecimal remaining = debt.getAmount().subtract(debt.getPaidAmount());
        boolean isOverdue = debt.getDueDate() != null
                && !debt.getIsPaid()
                && debt.getDueDate().isBefore(LocalDate.now());

        return CustomerDebtResponse.builder()
                .id(debt.getId())
                .customerId(debt.getCustomer() != null ? debt.getCustomer().getId() : null)
                .customerName(debt.getCustomer() != null ? debt.getCustomer().getName() : null)
                .customerPhone(debt.getCustomer() != null ? debt.getCustomer().getPhone() : null)
                .saleId(debt.getSale() != null ? debt.getSale().getId() : null)
                .saleReferenceNo(debt.getSale() != null ? debt.getSale().getReferenceNo() : null)
                .amount(debt.getAmount())
                .paidAmount(debt.getPaidAmount())
                .remainingAmount(remaining)
                .dueDate(debt.getDueDate())
                .isPaid(debt.getIsPaid())
                .isOverdue(isOverdue)
                .createdAt(debt.getCreatedAt())
                .payments(debt.getPayments().stream().map(p ->
                        CustomerDebtResponse.PaymentHistoryItem.builder()
                                .id(p.getId())
                                .amount(p.getAmount())
                                .paymentMethod(p.getPaymentMethod() != null ? p.getPaymentMethod().name() : null)
                                .notes(p.getNotes())
                                .paidAt(p.getPaidAt())
                                .paidBy(p.getPaidBy() != null ? p.getPaidBy().getFullName() : null)
                                .build()).toList())
                .build();
    }

    private CustomerResponse toResponse(Customer customer) {
        BigDecimal totalDebt = customerDebtRepository
                .getTotalDebtByCustomerId(customer.getId());

        boolean hasLimit = customer.getDebtLimit() != null
                && customer.getDebtLimit().compareTo(BigDecimal.ZERO) > 0;
        boolean limitExceeded = hasLimit && totalDebt.compareTo(customer.getDebtLimit()) > 0;
        BigDecimal limitRemaining = hasLimit
                ? customer.getDebtLimit().subtract(totalDebt)
                : null;

        return CustomerResponse.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .notes(customer.getNotes())
                .isActive(customer.getIsActive())
                .totalDebt(totalDebt)
                .debtLimit(customer.getDebtLimit())
                .debtLimitStrict(customer.getDebtLimitStrict())
                .limitExceeded(limitExceeded)
                .limitRemaining(limitRemaining)
                .createdAt(customer.getCreatedAt())
                .build();
    }
}