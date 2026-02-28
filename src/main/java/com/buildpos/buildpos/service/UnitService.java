package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.UnitRequest;
import com.buildpos.buildpos.dto.response.UnitResponse;
import com.buildpos.buildpos.entity.Unit;
import com.buildpos.buildpos.exception.AlreadyExistsException;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.ProductUnitRepository;
import com.buildpos.buildpos.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UnitService {

    private final UnitRepository unitRepository;
    private final ProductUnitRepository productUnitRepository;

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @Transactional
    public UnitResponse create(UnitRequest request) {
        if (unitRepository.existsBySymbolIgnoreCase(request.getSymbol())) {
            throw new AlreadyExistsException("Bu belgi allaqachon mavjud: " + request.getSymbol());
        }

        Unit unit = Unit.builder()
                .name(request.getName())
                .symbol(request.getSymbol().toLowerCase())
                .isActive(true)
                .build();

        return toResponse(unitRepository.save(unit));
    }

    // ─────────────────────────────────────────
    // GET ALL (faqat active)
    // ─────────────────────────────────────────
    public List<UnitResponse> getAllActive() {
        return unitRepository.findAllByIsActiveTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // GET ALL (admin uchun — inactive ham)
    // ─────────────────────────────────────────
    public List<UnitResponse> getAll() {
        return unitRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public UnitResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    @Transactional
    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = findById(id);

        // Symbol o'zgartirilayotgan bo'lsa — boshqa unit bilan conflict tekshirish
        if (!unit.getSymbol().equalsIgnoreCase(request.getSymbol()) &&
                unitRepository.existsBySymbolIgnoreCase(request.getSymbol())) {
            throw new AlreadyExistsException("Bu belgi allaqachon mavjud: " + request.getSymbol());
        }

        unit.setName(request.getName());
        unit.setSymbol(request.getSymbol().toLowerCase());

        return toResponse(unitRepository.save(unit));
    }

    // ─────────────────────────────────────────
    // TOGGLE STATUS (active/inactive)
    // ─────────────────────────────────────────
    @Transactional
    public UnitResponse toggleStatus(Long id) {
        Unit unit = findById(id);
        unit.setIsActive(!unit.getIsActive());
        return toResponse(unitRepository.save(unit));
    }

    // ─────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────
    @Transactional
    public void delete(Long id) {
        Unit unit = findById(id);

        // Bu unit biror mahsulotda ishlatilayaptimi?
        boolean inUse = !productUnitRepository.findAllByUnitId(id).isEmpty();
        if (inUse) {
            throw new BadRequestException(
                    "Bu o'lchov birligi mahsulotlarda ishlatilmoqda, o'chirib bo'lmaydi. " +
                            "Avval statusni 'inactive' qiling."
            );
        }

        unitRepository.delete(unit);
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private Unit findById(Long id) {
        return unitRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("O'lchov birligi topilmadi: " + id));
    }

    private UnitResponse toResponse(Unit unit) {
        return UnitResponse.builder()
                .id(unit.getId())
                .name(unit.getName())
                .symbol(unit.getSymbol())
                .isActive(unit.getIsActive())
                .createdAt(unit.getCreatedAt())
                .createdBy(unit.getCreatedBy() != null ? unit.getCreatedBy().getUsername() : null)
                .build();
    }
}