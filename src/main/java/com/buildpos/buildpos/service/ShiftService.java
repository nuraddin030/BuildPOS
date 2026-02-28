package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.CloseShiftRequest;
import com.buildpos.buildpos.dto.request.OpenShiftRequest;
import com.buildpos.buildpos.dto.response.ShiftResponse;
import com.buildpos.buildpos.entity.Shift;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.entity.Warehouse;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.ShiftRepository;
import com.buildpos.buildpos.repository.UserRepository;
import com.buildpos.buildpos.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;

    // ─────────────────────────────────────────
    // SMENA OCHISH
    // ─────────────────────────────────────────
    @Transactional
    public ShiftResponse openShift(OpenShiftRequest request, String username) {
        User cashier = findByUsername(username);

        shiftRepository.findByCashierIdAndStatus(cashier.getId(), ShiftStatus.OPEN)
                .ifPresent(s -> {
                    throw new BadRequestException("Sizning ochiq smenangiz allaqachon mavjud. Avval yoping.");
                });

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new NotFoundException("Ombor topilmadi"));

        Shift shift = Shift.builder()
                .cashier(cashier)
                .warehouse(warehouse)
                .status(ShiftStatus.OPEN)
                .openingCash(request.getOpeningCash())
                .openedAt(LocalDateTime.now())
                .build();

        return toResponse(shiftRepository.save(shift));
    }

    // ─────────────────────────────────────────
    // SMENA YOPISH
    // ─────────────────────────────────────────
    @Transactional
    public ShiftResponse closeShift(CloseShiftRequest request, String username) {
        User cashier = findByUsername(username);

        Shift shift = shiftRepository.findByCashierIdAndStatus(cashier.getId(), ShiftStatus.OPEN)
                .orElseThrow(() -> new NotFoundException("Ochiq smena topilmadi"));

        shift.setStatus(ShiftStatus.CLOSED);
        shift.setClosingCash(request.getClosingCash());
        shift.setClosedAt(LocalDateTime.now());
        shift.setNotes(request.getNotes());

        return toResponse(shiftRepository.save(shift));
    }

    // ─────────────────────────────────────────
    // JORIY SMENA
    // ─────────────────────────────────────────
    public ShiftResponse getCurrentShift(String username) {
        User cashier = findByUsername(username);
        Shift shift = shiftRepository.findByCashierIdAndStatus(cashier.getId(), ShiftStatus.OPEN)
                .orElseThrow(() -> new NotFoundException("Ochiq smena topilmadi"));
        return toResponse(shift);
    }

    // ─────────────────────────────────────────
    // TARIX
    // ─────────────────────────────────────────
    public Page<ShiftResponse> getAll(Pageable pageable) {
        return shiftRepository.findAllByOrderByOpenedAtDesc(pageable).map(this::toResponse);
    }

    public Page<ShiftResponse> getMyCashierShifts(String username, Pageable pageable) {
        User cashier = findByUsername(username);
        return shiftRepository.findAllByCashierIdOrderByOpenedAtDesc(cashier.getId(), pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi: " + username));
    }

    private ShiftResponse toResponse(Shift shift) {
        return ShiftResponse.builder()
                .id(shift.getId())
                .cashierId(shift.getCashier().getId())
                .cashierName(shift.getCashier().getFullName())
                .warehouseId(shift.getWarehouse().getId())
                .warehouseName(shift.getWarehouse().getName())
                .status(shift.getStatus())
                .openingCash(shift.getOpeningCash())
                .closingCash(shift.getClosingCash())
                .totalSales(shift.getTotalSales())
                .totalCash(shift.getTotalCash())
                .totalCard(shift.getTotalCard())
                .totalTransfer(shift.getTotalTransfer())
                .totalDebt(shift.getTotalDebt())
                .saleCount(shift.getSaleCount())
                .openedAt(shift.getOpenedAt())
                .closedAt(shift.getClosedAt())
                .notes(shift.getNotes())
                .build();
    }
}