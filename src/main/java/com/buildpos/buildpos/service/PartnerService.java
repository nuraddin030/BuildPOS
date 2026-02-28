package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.PartnerRequest;
import com.buildpos.buildpos.dto.response.PartnerResponse;
import com.buildpos.buildpos.entity.Partner;
import com.buildpos.buildpos.exception.AlreadyExistsException;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.PartnerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartnerService {

    private final PartnerRepository partnerRepository;

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @Transactional
    public PartnerResponse create(PartnerRequest request) {
        if (partnerRepository.existsByPhone(request.getPhone())) {
            throw new AlreadyExistsException(
                    "Bu telefon raqam allaqachon ro'yxatda bor: " + request.getPhone()
            );
        }

        Partner partner = Partner.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .notes(request.getNotes())
                .isActive(true)
                .build();

        return toResponse(partnerRepository.save(partner));
    }

    // ─────────────────────────────────────────
    // GET ALL
    // ─────────────────────────────────────────
    public Page<PartnerResponse> getAll(String search, Pageable pageable) {
        return partnerRepository.findAllFiltered(search, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public PartnerResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // GET BY PHONE
    // ─────────────────────────────────────────
    public PartnerResponse getByPhone(String phone) {
        Partner partner = partnerRepository.findByPhone(phone)
                .orElseThrow(() -> new NotFoundException("Hamkor topilmadi: " + phone));
        return toResponse(partner);
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    @Transactional
    public PartnerResponse update(Long id, PartnerRequest request) {
        Partner partner = findById(id);

        if (!partner.getPhone().equals(request.getPhone()) &&
                partnerRepository.existsByPhone(request.getPhone())) {
            throw new AlreadyExistsException(
                    "Bu telefon raqam allaqachon ro'yxatda bor: " + request.getPhone()
            );
        }

        partner.setName(request.getName());
        partner.setPhone(request.getPhone());
        partner.setNotes(request.getNotes());

        return toResponse(partnerRepository.save(partner));
    }

    // ─────────────────────────────────────────
    // TOGGLE STATUS
    // ─────────────────────────────────────────
    @Transactional
    public PartnerResponse toggleStatus(Long id) {
        Partner partner = findById(id);
        partner.setIsActive(!partner.getIsActive());
        return toResponse(partnerRepository.save(partner));
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private Partner findById(Long id) {
        return partnerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Hamkor topilmadi: " + id));
    }

    private PartnerResponse toResponse(Partner partner) {
        Long id = partner.getId();

        return PartnerResponse.builder()
                .id(id)
                .name(partner.getName())
                .phone(partner.getPhone())
                .notes(partner.getNotes())
                .isActive(partner.getIsActive())
                .createdAt(partner.getCreatedAt())
                .totalSaleCount(partnerRepository.countCompletedSalesByPartnerId(id))
                .totalSaleAmount(partnerRepository.sumTotalAmountByPartnerId(id))
                .avgSaleAmount(partnerRepository.avgTotalAmountByPartnerId(id))
                .totalCustomerCount(partnerRepository.countDistinctCustomersByPartnerId(id))
                .paidSaleCount(partnerRepository.countPaidSalesByPartnerId(id))
                .debtSaleCount(partnerRepository.countDebtSalesByPartnerId(id))
                .lastSaleAt(partnerRepository.findLastSaleAtByPartnerId(id))
                .bestMonth(partnerRepository.findBestMonthByPartnerId(id))
                .build();
    }
}