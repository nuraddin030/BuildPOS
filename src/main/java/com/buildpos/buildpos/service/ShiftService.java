package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.CloseShiftRequest;
import com.buildpos.buildpos.dto.request.OpenShiftRequest;
import com.buildpos.buildpos.dto.response.ShiftResponse;
import com.buildpos.buildpos.dto.response.ShiftSummaryResponse;
import com.buildpos.buildpos.entity.Sale;
import com.buildpos.buildpos.entity.SaleItem;
import com.buildpos.buildpos.entity.Shift;
import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.entity.Warehouse;
import com.buildpos.buildpos.entity.enums.PaymentMethod;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.ExpenseRepository;
import com.buildpos.buildpos.repository.SaleRepository;
import com.buildpos.buildpos.repository.ShiftRepository;
import com.buildpos.buildpos.repository.UserRepository;
import com.buildpos.buildpos.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final SaleRepository saleRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;

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
        // Avval o'z smenasini qidiradi, topilmasa — istalgan ochiq smenani oladi
        Shift shift = shiftRepository.findByCashierIdAndStatus(cashier.getId(), ShiftStatus.OPEN)
                .or(() -> shiftRepository.findFirstByStatus(ShiftStatus.OPEN))
                .orElseThrow(() -> new NotFoundException("Ochiq smena topilmadi"));
        return toResponse(shift);
    }

    // ─────────────────────────────────────────
    // ID BO'YICHA SMENA
    // ─────────────────────────────────────────
    public ShiftResponse getById(Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Smena topilmadi: " + id));
        return toResponse(shift);
    }

    // ─────────────────────────────────────────
    // SMENA HISOBOTI (SUMMARY)
    // ─────────────────────────────────────────
    public ShiftSummaryResponse getShiftSummary(Long shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new NotFoundException("Smena topilmadi: " + shiftId));

        List<Sale> sales = saleRepository.findAllByShiftId(shiftId);

        // Statistika hisoblash
        int saleCount = 0;
        int cancelledCount = 0;
        int returnedCount = 0;
        BigDecimal totalSales = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal totalCash = BigDecimal.ZERO;
        BigDecimal totalCard = BigDecimal.ZERO;
        BigDecimal totalTransfer = BigDecimal.ZERO;
        BigDecimal totalDebt = BigDecimal.ZERO;

        // Top mahsulotlar uchun map: productUnitId -> {name, unit, qty, amount}
        Map<Long, ShiftSummaryResponse.TopProductItem.TopProductItemBuilder> productMap = new HashMap<>();

        for (Sale sale : sales) {
            switch (sale.getStatus()) {
                case COMPLETED -> {
                    saleCount++;
                    totalSales = totalSales.add(sale.getTotalAmount());
                    totalDiscount = totalDiscount.add(
                            sale.getDiscountAmount() != null ? sale.getDiscountAmount() : BigDecimal.ZERO);

                    // To'lov usullari
                    for (var payment : sale.getPayments()) {
                        switch (payment.getPaymentMethod()) {
                            case CASH     -> totalCash     = totalCash.add(payment.getAmount());
                            case CARD     -> totalCard     = totalCard.add(payment.getAmount());
                            case TRANSFER -> totalTransfer = totalTransfer.add(payment.getAmount());
                            case DEBT     -> totalDebt     = totalDebt.add(payment.getAmount());
                        }
                    }

                    // Top mahsulotlar
                    for (SaleItem item : sale.getItems()) {
                        Long puId = item.getProductUnit().getId();
                        productMap.computeIfAbsent(puId, k ->
                                ShiftSummaryResponse.TopProductItem.builder()
                                        .productName(item.getProductUnit().getProduct().getName())
                                        .unitName(item.getProductUnit().getUnit().getName())
                                        .totalQuantity(BigDecimal.ZERO)
                                        .totalAmount(BigDecimal.ZERO)
                        );
                        var builder = productMap.get(puId);
                        // qty va amount ni yig'ish uchun temp object ishlatamiz
                    }
                }
                case CANCELLED -> cancelledCount++;
                case RETURNED  -> returnedCount++;
                default -> {}
            }
        }

        // Top 5 mahsulot — sodda hisoblash
        List<ShiftSummaryResponse.TopProductItem> topProducts = buildTopProducts(sales);

        // Davomiylik
        String duration = formatDuration(shift.getOpenedAt(),
                shift.getClosedAt() != null ? shift.getClosedAt() : LocalDateTime.now());

        // Smena harajatlari — to'lov usuli bo'yicha
        BigDecimal expenseCash     = expenseRepository.sumByShiftAndMethod(shift.getId(), com.buildpos.buildpos.entity.enums.PaymentMethod.CASH);
        BigDecimal expenseCard     = expenseRepository.sumByShiftAndMethod(shift.getId(), com.buildpos.buildpos.entity.enums.PaymentMethod.CARD);
        BigDecimal expenseTransfer = expenseRepository.sumByShiftAndMethod(shift.getId(), com.buildpos.buildpos.entity.enums.PaymentMethod.TRANSFER);
        if (expenseCash     == null) expenseCash     = BigDecimal.ZERO;
        if (expenseCard     == null) expenseCard     = BigDecimal.ZERO;
        if (expenseTransfer == null) expenseTransfer = BigDecimal.ZERO;

        // payment_method NULL bo'lgan eski harajatlar (naqd deb hisoblanadi)
        BigDecimal totalExpensesAll = expenseRepository.sumByShift(shift.getId());
        if (totalExpensesAll == null) totalExpensesAll = BigDecimal.ZERO;
        BigDecimal totalExpenses = totalExpensesAll;

        // Kassaga ta'sir qiladigan faqat naqd harajatlar
        BigDecimal expectedCash = shift.getOpeningCash().add(totalCash).subtract(expenseCash);
        BigDecimal cashDiff = BigDecimal.ZERO;
        if (shift.getClosingCash() != null) {
            cashDiff = shift.getClosingCash().subtract(expectedCash);
        }

        // O'rtacha chek
        BigDecimal avgSale = saleCount > 0
                ? totalSales.divide(BigDecimal.valueOf(saleCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return ShiftSummaryResponse.builder()
                .shiftId(shift.getId())
                .cashierName(shift.getCashier().getFullName())
                .warehouseName(shift.getWarehouse().getName())
                .openedAt(shift.getOpenedAt())
                .closedAt(shift.getClosedAt())
                .durationFormatted(duration)
                .openingCash(shift.getOpeningCash())
                .closingCash(shift.getClosingCash())
                .totalExpenses(totalExpenses)
                .expenseCash(expenseCash)
                .expenseCard(expenseCard)
                .expenseTransfer(expenseTransfer)
                .expectedCash(expectedCash)
                .cashDifference(cashDiff)
                .saleCount(saleCount)
                .cancelledCount(cancelledCount)
                .returnedCount(returnedCount)
                .totalSales(totalSales)
                .totalDiscount(totalDiscount)
                .averageSale(avgSale)
                .totalCash(totalCash)
                .totalCard(totalCard)
                .totalTransfer(totalTransfer)
                .totalDebt(totalDebt)
                .topProducts(topProducts)
                .build();
    }

    // ─────────────────────────────────────────
    // TARIX (FILTER)
    // ─────────────────────────────────────────
    public Page<ShiftResponse> getAll(Pageable pageable) {
        return shiftRepository.findAllByOrderByOpenedAtDesc(pageable).map(this::toResponse);
    }

    public Page<ShiftResponse> getAllFiltered(Long cashierId, LocalDateTime from,
                                              LocalDateTime to, Pageable pageable) {
        return shiftRepository.findAllFiltered(cashierId, from, to, pageable).map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // SANA BO'YICHA SMENALAR (harajat formasi uchun)
    // ─────────────────────────────────────────
    public List<ShiftResponse> getShiftsByDate(LocalDate date) {
        return shiftRepository.findByDate(date)
                .stream().map(this::toResponse).toList();
    }

    public Page<ShiftResponse> getMyCashierShifts(String username, Pageable pageable) {
        User cashier = findByUsername(username);
        return shiftRepository.findAllByCashierIdOrderByOpenedAtDesc(cashier.getId(), pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────
    private User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi: " + username));
    }

    private String formatDuration(LocalDateTime from, LocalDateTime to) {
        Duration d = Duration.between(from, to);
        long hours = d.toHours();
        long minutes = d.toMinutesPart();
        if (hours > 0) {
            return hours + " soat " + minutes + " daqiqa";
        }
        return minutes + " daqiqa";
    }

    private List<ShiftSummaryResponse.TopProductItem> buildTopProducts(List<Sale> sales) {
        // productUnitId -> [name, unitName, totalQty, totalAmount]
        Map<Long, Object[]> map = new HashMap<>();

        for (Sale sale : sales) {
            if (sale.getStatus() != SaleStatus.COMPLETED) continue;
            for (SaleItem item : sale.getItems()) {
                Long puId = item.getProductUnit().getId();
                map.computeIfAbsent(puId, k -> new Object[]{
                        item.getProductUnit().getProduct().getName(),
                        item.getProductUnit().getUnit().getName(),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO
                });
                Object[] row = map.get(puId);
                row[2] = ((BigDecimal) row[2]).add(item.getQuantity());
                row[3] = ((BigDecimal) row[3]).add(item.getTotalPrice());
            }
        }

        return map.values().stream()
                .sorted((a, b) -> ((BigDecimal) b[3]).compareTo((BigDecimal) a[3]))
                .limit(5)
                .map(row -> ShiftSummaryResponse.TopProductItem.builder()
                        .productName((String) row[0])
                        .unitName((String) row[1])
                        .totalQuantity((BigDecimal) row[2])
                        .totalAmount((BigDecimal) row[3])
                        .build())
                .toList();
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