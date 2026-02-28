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

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    // PRIVATE
    // ─────────────────────────────────────────
    private Customer findById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Mijoz topilmadi: " + id));
    }

    private CustomerResponse toResponse(Customer customer) {
        BigDecimal totalDebt = customerDebtRepository
                .getTotalDebtByCustomerId(customer.getId());

        return CustomerResponse.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .notes(customer.getNotes())
                .isActive(customer.getIsActive())
                .totalDebt(totalDebt)
                .createdAt(customer.getCreatedAt())
                .build();
    }
}