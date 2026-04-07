package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.ApprovePendingRequest;
import com.buildpos.buildpos.dto.request.ReturnRequest;
import com.buildpos.buildpos.dto.request.SaleRequest;
import com.buildpos.buildpos.dto.response.SaleResponse;
import com.buildpos.buildpos.dto.response.TodayStatsResponse;
import com.buildpos.buildpos.entity.Partner;
import com.buildpos.buildpos.repository.PartnerRepository;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.entity.enums.DiscountType;
import com.buildpos.buildpos.entity.enums.SaleStatus;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.entity.enums.PaymentMethod;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import com.buildpos.buildpos.util.StockCalculator;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SaleService {

    private final SaleRepository saleRepository;
    private final ShiftRepository shiftRepository;
    private final CustomerRepository customerRepository;
    private final CustomerDebtRepository customerDebtRepository;
    private final ProductUnitRepository productUnitRepository;
    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final PartnerRepository partnerRepository;

    // ─────────────────────────────────────────
    // SAVATCHA YARATISH
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse createDraft(SaleRequest request, String username) {
        User seller = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi: " + username));

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new NotFoundException("Ombor topilmadi"));

        Sale sale = Sale.builder()
                .referenceNo(generateReferenceNo())
                .seller(seller)
                .warehouse(warehouse)
                .status(SaleStatus.DRAFT)
                .subtotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .paidAmount(BigDecimal.ZERO)
                .debtAmount(BigDecimal.ZERO)
                .changeAmount(BigDecimal.ZERO)
                .notes(request.getNotes())
                .build();

        if (request.getCustomerId() != null) {
            Customer customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new NotFoundException("Mijoz topilmadi"));
            sale.setCustomer(customer);
        }

        if (request.getPartnerId() != null) {
            Partner partner = partnerRepository.findById(request.getPartnerId())
                    .orElseThrow(() -> new NotFoundException("Hamkor topilmadi"));
            if (!partner.getIsActive()) {
                throw new BadRequestException("Hamkor noaktiv: " + partner.getName());
            }
            sale.setPartner(partner);
        }

        sale = saleRepository.save(sale);

        BigDecimal subtotal = BigDecimal.ZERO;
        for (SaleRequest.SaleItemRequest itemReq : request.getItems()) {
            ProductUnit productUnit = productUnitRepository.findById(itemReq.getProductUnitId())
                    .orElseThrow(() -> new NotFoundException("Mahsulot topilmadi: " + itemReq.getProductUnitId()));

            Warehouse itemWarehouse = warehouseRepository.findById(itemReq.getWarehouseId())
                    .orElseThrow(() -> new NotFoundException("Ombor topilmadi: " + itemReq.getWarehouseId()));

            BigDecimal salePrice = itemReq.getSalePrice() != null
                    ? itemReq.getSalePrice()
                    : productUnit.getSalePrice();

            if (salePrice.compareTo(productUnit.getMinPrice()) < 0) {
                throw new BadRequestException(
                        productUnit.getProduct().getName() + " uchun minimal narx: "
                                + productUnit.getMinPrice() + ". Kiritilgan: " + salePrice
                );
            }

            BigDecimal itemDiscountAmount = calculateDiscount(
                    salePrice, itemReq.getQuantity(),
                    itemReq.getDiscountType(), itemReq.getDiscountValue()
            );

            BigDecimal itemTotal = salePrice.multiply(itemReq.getQuantity()).subtract(itemDiscountAmount);
            subtotal = subtotal.add(itemTotal);

            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .productUnit(productUnit)
                    .warehouse(itemWarehouse)
                    .quantity(itemReq.getQuantity())
                    .originalPrice(productUnit.getSalePrice())
                    .salePrice(salePrice)
                    .minPrice(productUnit.getMinPrice())
                    .discountType(itemReq.getDiscountType())
                    .discountValue(itemReq.getDiscountValue() != null ? itemReq.getDiscountValue() : BigDecimal.ZERO)
                    .discountAmount(itemDiscountAmount)
                    .totalPrice(itemTotal)
                    .build();

            sale.getItems().add(item);
        }

        BigDecimal overallDiscountAmount = calculateDiscount(
                subtotal, BigDecimal.ONE,
                request.getDiscountType(), request.getDiscountValue()
        );

        sale.setSubtotal(subtotal);
        sale.setDiscountType(request.getDiscountType());
        sale.setDiscountValue(request.getDiscountValue() != null ? request.getDiscountValue() : BigDecimal.ZERO);
        sale.setDiscountAmount(overallDiscountAmount);
        sale.setTotalAmount(subtotal.subtract(overallDiscountAmount));

        sale = saleRepository.save(sale);

        // DRAFT yaratilganda faqat stock tekshiramiz — kamaytirishni COMPLETE/APPROVE da qilamiz
        checkStockForSale(sale);

        return toResponse(sale);
    }

    // ─────────────────────────────────────────
    // SOTUVNI YAKUNLASH
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse complete(Long id, List<SaleRequest.SalePaymentRequest> payments,
                                 String cashierUsername) {
        Sale sale = findById(id);

        if (sale.getStatus() != SaleStatus.DRAFT) {
            throw new BadRequestException("Faqat DRAFT statusdagi savatchani yakunlash mumkin");
        }

        boolean hasDebt = payments.stream()
                .anyMatch(p -> p.getPaymentMethod() == PaymentMethod.DEBT);
        if (hasDebt && sale.getCustomer() == null) {
            throw new BadRequestException("Nasiya sotuvda mijoz ko'rsatilishi shart");
        }

        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal debtAmount = BigDecimal.ZERO;
        LocalDate debtDueDate = null;

        for (SaleRequest.SalePaymentRequest paymentReq : payments) {
            SalePayment payment = SalePayment.builder()
                    .sale(sale)
                    .paymentMethod(paymentReq.getPaymentMethod())
                    .amount(paymentReq.getAmount())
                    .notes(paymentReq.getNotes())
                    .dueDate(paymentReq.getPaymentMethod() == PaymentMethod.DEBT
                            ? paymentReq.getDueDate() : null)
                    .build();
            sale.getPayments().add(payment);

            if (paymentReq.getPaymentMethod() == PaymentMethod.DEBT) {
                debtAmount = debtAmount.add(paymentReq.getAmount());
                if (paymentReq.getDueDate() != null) debtDueDate = paymentReq.getDueDate();
            } else {
                totalPaid = totalPaid.add(paymentReq.getAmount());
            }
        }

        BigDecimal allPaid = totalPaid.add(debtAmount);
        if (allPaid.compareTo(sale.getTotalAmount()) < 0) {
            throw new BadRequestException(
                    "To'lov yetarli emas. Kerak: " + sale.getTotalAmount() + ", To'langan: " + allPaid
            );
        }

        BigDecimal changeAmount = allPaid.subtract(sale.getTotalAmount());
        sale.setPaidAmount(totalPaid);
        sale.setDebtAmount(debtAmount);
        sale.setChangeAmount(changeAmount.compareTo(BigDecimal.ZERO) > 0 ? changeAmount : BigDecimal.ZERO);

        // To'lovni yakunlayotgan foydalanuvchi (admin yoki kassir) — smena uchun kerak
        User completingUser = userRepository.findByUsername(cashierUsername)
                .orElseThrow(() -> new NotFoundException("Kassir topilmadi"));
        // sale.setCashier() — o'zgartirilmaydi: original sotuvchi saqlanadi

        shiftRepository.findByCashierIdAndStatus(completingUser.getId(), ShiftStatus.OPEN)
                .ifPresent(sale::setShift);

        // Stock kamaytirish + SALE_OUT movement
        deductStockForSale(sale);

        if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
            CustomerDebt debt = CustomerDebt.builder()
                    .customer(sale.getCustomer())
                    .sale(sale)
                    .amount(debtAmount)
                    .paidAmount(BigDecimal.ZERO)
                    .isPaid(false)
                    .dueDate(debtDueDate)
                    .build();
            customerDebtRepository.save(debt);
        }

        if (sale.getShift() != null) {
            updateShiftReport(sale.getShift(), sale, payments);
        }

        sale.setStatus(SaleStatus.COMPLETED);
        sale.setCompletedAt(LocalDateTime.now());

        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // MIJOZ BIRIKTIRISH
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse setCustomer(Long saleId, Long customerId) {
        Sale sale = findById(saleId);
        if (sale.getStatus() != SaleStatus.DRAFT && sale.getStatus() != SaleStatus.PENDING) {
            throw new BadRequestException("Faqat DRAFT yoki PENDING savatchaga mijoz biriktirish mumkin");
        }
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Mijoz topilmadi: " + customerId));
        sale.setCustomer(customer);
        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // TASDIQLASHGA YUBORISH (DRAFT → PENDING)
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse submitPending(Long id, String username, String note) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.DRAFT) {
            throw new BadRequestException("Faqat DRAFT statusdagi savatchani yuborish mumkin");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi: " + username));
        boolean isAdminOrOwner = "ADMIN".equals(user.getRole().getName())
                || "OWNER".equals(user.getRole().getName());
        if (!isAdminOrOwner && !sale.getSeller().getId().equals(user.getId())) {
            throw new BadRequestException("Faqat o'z savatchasini yuborish mumkin");
        }
        if (note != null && !note.isBlank()) {
            sale.setNotes(note.trim());
        }
        sale.setStatus(SaleStatus.PENDING);
        sale.setSubmittedAt(LocalDateTime.now());
        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // PENDING BUYURTMANI TASDIQLASH (PENDING → COMPLETED)
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse approvePending(Long id, ApprovePendingRequest request, String username) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING statusdagi buyurtmani tasdiqlash mumkin");
        }

        // Mijoz: ega o'zgartirsa yoki birinchi marta belgilasa
        if (request.getCustomerId() != null) {
            Customer customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new NotFoundException("Mijoz topilmadi"));
            sale.setCustomer(customer);
        }

        // Ega chegirma bersa — subtotal asosida qayta hisoblash
        if (request.getDiscountType() != null && request.getDiscountValue() != null
                && request.getDiscountValue().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal discountAmount = calculateDiscount(
                    sale.getSubtotal(), BigDecimal.ONE,
                    request.getDiscountType(), request.getDiscountValue());
            sale.setDiscountType(request.getDiscountType());
            sale.setDiscountValue(request.getDiscountValue());
            sale.setDiscountAmount(discountAmount);
            sale.setTotalAmount(sale.getSubtotal().subtract(discountAmount));
        }

        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            sale.setNotes(request.getNotes());
        }

        // To'lov
        boolean hasDebt = request.getPayments().stream()
                .anyMatch(p -> p.getPaymentMethod() == PaymentMethod.DEBT);
        if (hasDebt && sale.getCustomer() == null) {
            throw new BadRequestException("Nasiya sotuvda mijoz ko'rsatilishi shart");
        }

        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal debtAmount = BigDecimal.ZERO;
        LocalDate debtDueDate = null;

        for (SaleRequest.SalePaymentRequest paymentReq : request.getPayments()) {
            SalePayment payment = SalePayment.builder()
                    .sale(sale)
                    .paymentMethod(paymentReq.getPaymentMethod())
                    .amount(paymentReq.getAmount())
                    .notes(paymentReq.getNotes())
                    .dueDate(paymentReq.getPaymentMethod() == PaymentMethod.DEBT
                            ? paymentReq.getDueDate() : null)
                    .build();
            sale.getPayments().add(payment);

            if (paymentReq.getPaymentMethod() == PaymentMethod.DEBT) {
                debtAmount = debtAmount.add(paymentReq.getAmount());
                if (paymentReq.getDueDate() != null) debtDueDate = paymentReq.getDueDate();
            } else {
                totalPaid = totalPaid.add(paymentReq.getAmount());
            }
        }

        BigDecimal allPaid = totalPaid.add(debtAmount);
        if (allPaid.compareTo(sale.getTotalAmount()) < 0) {
            throw new BadRequestException(
                    "To'lov yetarli emas. Kerak: " + sale.getTotalAmount() + ", To'langan: " + allPaid);
        }

        BigDecimal changeAmount = allPaid.subtract(sale.getTotalAmount());
        sale.setPaidAmount(totalPaid);
        sale.setDebtAmount(debtAmount);
        sale.setChangeAmount(changeAmount.compareTo(BigDecimal.ZERO) > 0 ? changeAmount : BigDecimal.ZERO);

        User cashier = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Kassir topilmadi"));
        sale.setCashier(cashier);

        shiftRepository.findByCashierIdAndStatus(cashier.getId(), ShiftStatus.OPEN)
                .ifPresent(sale::setShift);

        // Stock kamaytirish + SALE_OUT movement
        deductStockForSale(sale);

        if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
            CustomerDebt debt = CustomerDebt.builder()
                    .customer(sale.getCustomer())
                    .sale(sale)
                    .amount(debtAmount)
                    .paidAmount(BigDecimal.ZERO)
                    .isPaid(false)
                    .dueDate(debtDueDate)
                    .build();
            customerDebtRepository.save(debt);
        }

        if (sale.getShift() != null) {
            updateShiftReport(sale.getShift(), sale, request.getPayments());
        }

        sale.setStatus(SaleStatus.COMPLETED);
        sale.setCompletedAt(LocalDateTime.now());

        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // PENDING BUYURTMALAR RO'YXATI
    // ─────────────────────────────────────────
    public Page<SaleResponse> getPendingOrders(Pageable pageable) {
        return saleRepository.findAllByStatusOrderBySubmittedAtDesc(SaleStatus.PENDING, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // RAD ETISH (PENDING → HOLD)
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse rejectPending(Long id, String reason) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING statusdagi buyurtmani rad etish mumkin");
        }
        sale.setStatus(SaleStatus.HOLD);
        if (reason != null && !reason.isBlank()) {
            String existing = sale.getNotes() != null ? sale.getNotes() + "\n" : "";
            sale.setNotes(existing + "Rad etildi: " + reason);
        }
        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // O'Z PENDING BUYURTMALARI
    // ─────────────────────────────────────────
    public Page<SaleResponse> getMyPendingOrders(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi: " + username));
        return saleRepository.findAllBySellerIdAndStatusOrderByCreatedAtDesc(
                user.getId(), SaleStatus.PENDING, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // BEKOR QILISH
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse cancel(Long id) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.DRAFT
                && sale.getStatus() != SaleStatus.HOLD
                && sale.getStatus() != SaleStatus.PENDING) {
            throw new BadRequestException("Faqat ochiq savatchani bekor qilish mumkin");
        }
        // DRAFT/HOLD/PENDING da stock hech qachon kaymaydi — returnStockForSale chaqirmaymiz
        sale.setStatus(SaleStatus.CANCELLED);
        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // QAYTARISH (RETURN) — yangi
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse returnSale(Long saleId, ReturnRequest request, String username) {
        Sale sale = findById(saleId);

        if (sale.getStatus() != SaleStatus.COMPLETED) {
            throw new BadRequestException("Faqat yakunlangan sotuvni qaytarish mumkin");
        }

        for (ReturnRequest.ReturnItem returnItem : request.getItems()) {
            SaleItem saleItem = sale.getItems().stream()
                    .filter(i -> i.getId().equals(returnItem.getSaleItemId()))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException(
                            "Sotuv itemı topilmadi: " + returnItem.getSaleItemId()));

            BigDecimal alreadyReturned = saleItem.getReturnedQuantity() != null
                    ? saleItem.getReturnedQuantity() : BigDecimal.ZERO;
            BigDecimal remaining = saleItem.getQuantity().subtract(alreadyReturned);

            if (returnItem.getQuantity().compareTo(remaining) > 0) {
                throw new BadRequestException(
                        saleItem.getProductUnit().getProduct().getName()
                                + ": qaytarish miqdori oshib ketdi. "
                                + "Qaytarish mumkin: " + remaining
                                + ", Qaytarilmoqchi: " + returnItem.getQuantity());
            }

            // returnedQuantity yangilash — cascade orqali saqlanadi
            saleItem.setReturnedQuantity(alreadyReturned.add(returnItem.getQuantity()));

            // Stock qaytarish — non-base unit bo'lsa base unit stockiga qaytarish
            ProductUnit soldUnit = saleItem.getProductUnit();
            BigDecimal cf = soldUnit.getConversionFactor();
            BigDecimal returnBaseQty = (cf != null && cf.compareTo(BigDecimal.ONE) != 0)
                    ? returnItem.getQuantity().multiply(cf).setScale(4, RoundingMode.HALF_UP)
                    : returnItem.getQuantity();
            ProductUnit stockUnit = soldUnit;
            if (!Boolean.TRUE.equals(soldUnit.getIsBaseUnit())) {
                stockUnit = productUnitRepository
                        .findByProductIdAndIsBaseUnitTrue(soldUnit.getProduct().getId())
                        .orElse(soldUnit);
            }
            WarehouseStock stock = warehouseStockRepository
                    .findByWarehouseIdAndProductUnitId(
                            saleItem.getWarehouse().getId(), stockUnit.getId())
                    .orElse(null);
            if (stock != null) {
                stock.setQuantity(stock.getQuantity().add(returnBaseQty));
                warehouseStockRepository.save(stock);
            }

            // RETURN_IN movement
            BigDecimal returnTotal = saleItem.getSalePrice().multiply(returnItem.getQuantity());
            stockMovementRepository.save(StockMovement.builder()
                    .productUnit(stockUnit)
                    .movementType(StockMovementType.RETURN_IN)
                    .toWarehouse(saleItem.getWarehouse())
                    .quantity(returnBaseQty)
                    .unitPrice(saleItem.getSalePrice())
                    .totalPrice(returnTotal)
                    .referenceType("RETURN")
                    .referenceId(sale.getId())
                    .notes(request.getReason())
                    .build());
        }

        // Barcha itemlar to'liq qaytarilgandagina RETURNED status
        boolean allReturned = sale.getItems().stream().allMatch(item -> {
            BigDecimal returned = item.getReturnedQuantity() != null
                    ? item.getReturnedQuantity() : BigDecimal.ZERO;
            return returned.compareTo(item.getQuantity()) >= 0;
        });
        if (allReturned) {
            // @Modifying query — cascade/orphanRemoval dan chetlab o'tib faqat status yangilanadi
            saleRepository.updateStatus(sale.getId(), SaleStatus.RETURNED);
        }
        // items dirty-tracking orqali @Transactional commit da saqlanadi

        return toResponse(saleRepository.findById(sale.getId())
                .orElseThrow(() -> new NotFoundException("Sale topilmadi")));
    }

    // ─────────────────────────────────────────
    // BUGUNGI STATISTIKA — yangi
    // ─────────────────────────────────────────
    public TodayStatsResponse getTodayStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay   = startOfDay.plusDays(1);

        // Object[] emas — List<Object[]> dan birinchi elementni olamiz
        List<Object[]> rows = saleRepository.getTodayStatsList(startOfDay, endOfDay);
        Object[] row = rows.isEmpty() ? new Object[]{0L, 0, 0, 0L, 0L} : rows.get(0);

        long saleCount      = row[0] != null ? ((Number) row[0]).longValue() : 0L;
        BigDecimal total    = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
        BigDecimal discount = row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO;
        long cancelled      = row[3] != null ? ((Number) row[3]).longValue() : 0L;
        long returned       = row[4] != null ? ((Number) row[4]).longValue() : 0L;

        BigDecimal cash           = orZero(saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "CASH"));
        BigDecimal card           = orZero(saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "CARD"));
        BigDecimal transfer       = orZero(saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "TRANSFER"));
        BigDecimal debt           = orZero(saleRepository.sumTodayByPaymentMethod(startOfDay, endOfDay, "DEBT"));
        BigDecimal returnedAmount = orZero(saleRepository.sumReturnedAmount(startOfDay, endOfDay));

        return TodayStatsResponse.builder()
                .saleCount(saleCount)
                .totalAmount(total)
                .totalDiscount(discount)
                .cancelledCount(cancelled)
                .returnedCount(returned)
                .returnedAmount(returnedAmount)
                .totalCash(cash)
                .totalCard(card)
                .totalTransfer(transfer)
                .totalDebt(debt)
                .build();
    }
    // ─────────────────────────────────────────
    // HOLD / UNHOLD
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse holdSale(Long id, String username) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.DRAFT) {
            throw new BadRequestException("Faqat DRAFT statusdagi savatchani kechiktirish mumkin");
        }
        sale.setStatus(SaleStatus.HOLD);
        return toResponse(saleRepository.save(sale));
    }

    @Transactional
    public SaleResponse takePending(Long id, String username) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING statusdagi buyurtmani olish mumkin");
        }
        sale.setStatus(SaleStatus.DRAFT);
        return toResponse(saleRepository.save(sale));
    }

    @Transactional
    public SaleResponse unholdSale(Long id, String username) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.HOLD && sale.getStatus() != SaleStatus.DRAFT) {
            throw new BadRequestException("Faqat HOLD yoki DRAFT statusdagi savatchani ochish mumkin");
        }
        returnStockForSale(sale, "UNHOLD");
        sale.setStatus(SaleStatus.DRAFT);
        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // OMBOR TEKSHIRISH
    // ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<Map<String, Object>> checkWarehouses(List<Long> productUnitIds) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Long productUnitId : productUnitIds) {
            ProductUnit unit = productUnitRepository.findById(productUnitId).orElse(null);
            if (unit == null) continue;

            // Non-base unit bo'lsa — base unit ning stockini ishlatamiz
            Long stockUnitId = productUnitId;
            if (!Boolean.TRUE.equals(unit.getIsBaseUnit())) {
                stockUnitId = productUnitRepository
                        .findByProductIdAndIsBaseUnitTrue(unit.getProduct().getId())
                        .map(ProductUnit::getId)
                        .orElse(productUnitId);
            }

            final Long finalStockUnitId = stockUnitId;
            List<WarehouseStock> stocks = warehouseStockRepository
                    .findAllByProductUnitId(finalStockUnitId)
                    .stream()
                    .filter(s -> s.getQuantity().compareTo(BigDecimal.ZERO) > 0)
                    .toList();

            List<Map<String, Object>> warehouses = stocks.stream().map(s -> {
                Map<String, Object> w = new java.util.HashMap<>();
                w.put("warehouseId", s.getWarehouse().getId());
                w.put("warehouseName", s.getWarehouse().getName());
                w.put("quantity", s.getQuantity());
                return w;
            }).toList();

            Map<String, Object> item = new java.util.HashMap<>();
            item.put("productUnitId", productUnitId);
            item.put("warehouses", warehouses);
            item.put("needsSelection", warehouses.size() > 1);
            result.add(item);
        }
        return result;
    }

    // ─────────────────────────────────────────
    // OCHIQ SAVATCHALAR (DRAFT + HOLD)
    // ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public Page<SaleResponse> getOpenSales(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi"));

        List<String> openStatuses = List.of("DRAFT", "HOLD");

        if ("ADMIN".equals(user.getRole().getName()) || "OWNER".equals(user.getRole().getName())) {
            return saleRepository.findAllByStatusInOrderByCreatedAtDesc(openStatuses, pageable)
                    .map(this::toResponse);
        }
        return saleRepository.findAllBySellerIdAndStatusInOrderByCreatedAtDesc(
                        user.getId(), openStatuses, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // KASSIR — barcha DRAFT savatchalar
    // ─────────────────────────────────────────
    public Page<SaleResponse> getDraftSales(Pageable pageable) {
        return saleRepository.findAllByStatusOrderByCreatedAtDesc(SaleStatus.DRAFT, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // SOTUVCHI — faqat o'z savatchalari
    // ─────────────────────────────────────────
    public Page<SaleResponse> getMyDraftSales(String username, Pageable pageable) {
        User seller = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi"));
        return saleRepository.findAllBySellerIdAndStatusOrderByCreatedAtDesc(
                        seller.getId(), SaleStatus.DRAFT, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // TARIX
    // ─────────────────────────────────────────
    public Page<SaleResponse> getHistory(Long sellerId, Long customerId, SaleStatus status,
                                         LocalDateTime from, LocalDateTime to, Pageable pageable) {
        // Native SQL uchun enum → String
        String statusStr = status != null ? status.name() : null;
        return saleRepository.findAllFiltered(sellerId, customerId, statusStr, from, to, pageable)
                .map(this::toResponse);
    }

    public Page<SaleResponse> getMyHistory(String username, SaleStatus status,
                                           LocalDateTime from, LocalDateTime to, Pageable pageable) {
        User seller = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi"));
        String statusStr = status != null ? status.name() : null;
        return saleRepository.findAllFiltered(seller.getId(), null, statusStr, from, to, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public SaleResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────
    private BigDecimal calculateDiscount(BigDecimal price, BigDecimal quantity,
                                         DiscountType type, BigDecimal value) {
        if (type == null || value == null || value.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal base = price.multiply(quantity);
        if (type == DiscountType.PERCENT) {
            return base.multiply(value).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        }
        return value.min(base);
    }

    private void updateShiftReport(Shift shift, Sale sale,
                                   List<SaleRequest.SalePaymentRequest> payments) {
        BigDecimal totalSales    = shift.getTotalSales()    != null ? shift.getTotalSales()    : BigDecimal.ZERO;
        BigDecimal totalCash     = shift.getTotalCash()     != null ? shift.getTotalCash()     : BigDecimal.ZERO;
        BigDecimal totalCard     = shift.getTotalCard()     != null ? shift.getTotalCard()     : BigDecimal.ZERO;
        BigDecimal totalTransfer = shift.getTotalTransfer() != null ? shift.getTotalTransfer() : BigDecimal.ZERO;
        BigDecimal totalDebt     = shift.getTotalDebt()     != null ? shift.getTotalDebt()     : BigDecimal.ZERO;
        int saleCount            = shift.getSaleCount()     != null ? shift.getSaleCount()     : 0;

        shift.setTotalSales(totalSales.add(sale.getTotalAmount()));
        shift.setSaleCount(saleCount + 1);

        for (SaleRequest.SalePaymentRequest p : payments) {
            switch (p.getPaymentMethod()) {
                case CASH     -> shift.setTotalCash(totalCash.add(p.getAmount()));
                case CARD     -> shift.setTotalCard(totalCard.add(p.getAmount()));
                case TRANSFER -> shift.setTotalTransfer(totalTransfer.add(p.getAmount()));
                case DEBT     -> shift.setTotalDebt(totalDebt.add(p.getAmount()));
            }
        }
        shiftRepository.save(shift);
    }

    // ─────────────────────────────────────────
    // STOCK DEDUCTION (konversiya bilan)
    // ─────────────────────────────────────────

    /**
     * Sotilgan birlik asosiy birlik bo'lmasa, base unit ombor stockidan
     * quantity × conversionFactor kamaytiradi.
     */
    private WarehouseStock resolveBaseStock(SaleItem item) {
        ProductUnit soldUnit = item.getProductUnit();

        if (Boolean.TRUE.equals(soldUnit.getIsBaseUnit())) {
            // Asosiy birlik — to'g'ridan to'g'ri shu unit ning stocki
            return warehouseStockRepository
                    .findByWarehouseIdAndProductUnitId(
                            item.getWarehouse().getId(), soldUnit.getId())
                    .orElseThrow(() -> new BadRequestException(
                            soldUnit.getProduct().getName() + " omborda mavjud emas"));
        }

        // Asosiy birlik emas — base unit ni topib, uning stockidan kamaytiramiz
        ProductUnit baseUnit = productUnitRepository
                .findByProductIdAndIsBaseUnitTrue(soldUnit.getProduct().getId())
                .orElse(soldUnit); // fallback: o'zini ishlatamiz

        return warehouseStockRepository
                .findByWarehouseIdAndProductUnitId(
                        item.getWarehouse().getId(), baseUnit.getId())
                .orElseThrow(() -> new BadRequestException(
                        soldUnit.getProduct().getName() + " omborda mavjud emas"));
    }

    /** Sotish uchun kerakli stock miqdorini hisoblaydi (qty × conversionFactor) */
    private BigDecimal effectiveQty(SaleItem item) {
        BigDecimal cf = item.getProductUnit().getConversionFactor();
        if (cf == null || cf.compareTo(BigDecimal.ONE) == 0) return item.getQuantity();
        return item.getQuantity().multiply(cf).setScale(4, RoundingMode.HALF_UP);
    }

    private void deductStockForSale(Sale sale) {
        for (SaleItem item : sale.getItems()) {
            WarehouseStock stock = resolveBaseStock(item);
            BigDecimal needed = effectiveQty(item);
            if (!StockCalculator.isEnough(stock.getQuantity(), needed)) {
                String unitName = item.getProductUnit().getUnit().getSymbol();
                BigDecimal available = stock.getQuantity();
                BigDecimal cf = item.getProductUnit().getConversionFactor();
                // Foydalanuvchiga qulay xabar: mavjud miqdorni sotilgan birlikka o'giramiz
                BigDecimal availableInSoldUnit = (cf != null && cf.compareTo(BigDecimal.ONE) != 0)
                        ? available.divide(cf, 2, RoundingMode.DOWN)
                        : available;
                throw new BadRequestException(
                        item.getProductUnit().getProduct().getName()
                                + " uchun yetarli tovar yo'q. Mavjud: "
                                + availableInSoldUnit + " " + unitName);
            }
            stock.setQuantity(StockCalculator.subtract(stock.getQuantity(), needed));
            warehouseStockRepository.save(stock);
            stockMovementRepository.save(StockMovement.builder()
                    .productUnit(item.getProductUnit())
                    .movementType(StockMovementType.SALE_OUT)
                    .fromWarehouse(item.getWarehouse())
                    .quantity(needed)
                    .unitPrice(item.getSalePrice())
                    .totalPrice(item.getTotalPrice())
                    .referenceType("SALE")
                    .referenceId(sale.getId())
                    .build());
        }
    }

    private void checkStockForSale(Sale sale) {
        for (SaleItem item : sale.getItems()) {
            WarehouseStock stock = resolveBaseStock(item);
            BigDecimal needed = effectiveQty(item);
            if (!StockCalculator.isEnough(stock.getQuantity(), needed)) {
                BigDecimal cf = item.getProductUnit().getConversionFactor();
                BigDecimal available = stock.getQuantity();
                BigDecimal availableInSoldUnit = (cf != null && cf.compareTo(BigDecimal.ONE) != 0)
                        ? available.divide(cf, 2, RoundingMode.DOWN)
                        : available;
                throw new BadRequestException(
                        item.getProductUnit().getProduct().getName()
                                + " uchun yetarli tovar yo'q. Mavjud: "
                                + availableInSoldUnit + " " + item.getProductUnit().getUnit().getSymbol());
            }
        }
    }

    private void returnStockForSale(Sale sale, String reason) {
        for (SaleItem item : sale.getItems()) {
            WarehouseStock stock = resolveBaseStock(item);
            BigDecimal qty = effectiveQty(item);
            stock.setQuantity(stock.getQuantity().add(qty));
            warehouseStockRepository.save(stock);
            stockMovementRepository.save(StockMovement.builder()
                    .productUnit(stock.getProductUnit())
                    .movementType(StockMovementType.ADJUSTMENT_IN)
                    .toWarehouse(item.getWarehouse())
                    .quantity(qty)
                    .unitPrice(item.getSalePrice())
                    .totalPrice(item.getTotalPrice())
                    .referenceType(reason)
                    .referenceId(sale.getId())
                    .build());
        }
    }

    private String generateReferenceNo() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = saleRepository.count() + 1;
        return String.format("SAL-%s-%04d", date, count);
    }

    private Sale findById(Long id) {
        return saleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Sotuv topilmadi: " + id));
    }

    private BigDecimal orZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public SaleResponse toResponsePublic(Sale sale) { return toResponse(sale); }

    private SaleResponse toResponse(Sale sale) {
        return SaleResponse.builder()
                .id(sale.getId())
                .referenceNo(sale.getReferenceNo())
                .shiftId(sale.getShift() != null ? sale.getShift().getId() : null)
                .cashierId(sale.getCashier() != null ? sale.getCashier().getId() : null)
                .cashierName(sale.getCashier() != null ? sale.getCashier().getFullName() : null)
                .sellerId(sale.getSeller().getId())
                .sellerName(sale.getSeller().getFullName())
                .customerId(sale.getCustomer() != null ? sale.getCustomer().getId() : null)
                .customerName(sale.getCustomer() != null ? sale.getCustomer().getName() : null)
                .customerPhone(sale.getCustomer() != null ? sale.getCustomer().getPhone() : null)
                .partnerId(sale.getPartner() != null ? sale.getPartner().getId() : null)
                .partnerName(sale.getPartner() != null ? sale.getPartner().getName() : null)
                .partnerPhone(sale.getPartner() != null ? sale.getPartner().getPhone() : null)
                .warehouseId(sale.getWarehouse().getId())
                .warehouseName(sale.getWarehouse().getName())
                .status(sale.getStatus())
                .subtotal(sale.getSubtotal())
                .discountType(sale.getDiscountType())
                .discountValue(sale.getDiscountValue())
                .discountAmount(sale.getDiscountAmount())
                .totalAmount(sale.getTotalAmount())
                .paidAmount(sale.getPaidAmount())
                .debtAmount(sale.getDebtAmount())
                .changeAmount(sale.getChangeAmount())
                .notes(sale.getNotes())
                .submittedAt(sale.getSubmittedAt())
                .completedAt(sale.getCompletedAt())
                .createdAt(sale.getCreatedAt())
                .items(sale.getItems().stream().map(item -> {
                    BigDecimal stock = warehouseStockRepository
                            .findByWarehouseIdAndProductUnitId(
                                    item.getWarehouse().getId(), item.getProductUnit().getId())
                            .map(WarehouseStock::getQuantity)
                            .orElse(BigDecimal.ZERO);
                    return SaleResponse.SaleItemResponse.builder()
                            .id(item.getId())
                            .productUnitId(item.getProductUnit().getId())
                            .productName(item.getProductUnit().getProduct().getName())
                            .unitSymbol(item.getProductUnit().getUnit().getSymbol())
                            .barcode(item.getProductUnit().getBarcode())
                            .warehouseId(item.getWarehouse().getId())
                            .warehouseName(item.getWarehouse().getName())
                            .quantity(item.getQuantity())
                            .originalPrice(item.getOriginalPrice())
                            .salePrice(item.getSalePrice())
                            .minPrice(item.getMinPrice())
                            .discountType(item.getDiscountType())
                            .discountValue(item.getDiscountValue())
                            .discountAmount(item.getDiscountAmount())
                            .totalPrice(item.getTotalPrice())
                            .returnedQuantity(item.getReturnedQuantity() != null
                                    ? item.getReturnedQuantity() : BigDecimal.ZERO)
                            .availableStock(stock)
                            .build();
                }).toList())
                .payments(sale.getPayments().stream().map(p ->
                        SaleResponse.SalePaymentResponse.builder()
                                .id(p.getId())
                                .paymentMethod(p.getPaymentMethod())
                                .amount(p.getAmount())
                                .notes(p.getNotes())
                                .dueDate(p.getDueDate())
                                .build()).toList())
                .build();
    }
    public TodayStatsResponse getStats(LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = saleRepository.getTodayStatsList(from, to);
        Object[] row = rows.isEmpty() ? new Object[]{0L, 0, 0, 0L, 0L} : rows.get(0);

        long saleCount      = row[0] != null ? ((Number) row[0]).longValue() : 0L;
        BigDecimal total    = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
        BigDecimal discount = row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO;
        long cancelled      = row[3] != null ? ((Number) row[3]).longValue() : 0L;
        long returned       = row[4] != null ? ((Number) row[4]).longValue() : 0L;

        BigDecimal cash           = orZero(saleRepository.sumTodayByPaymentMethod(from, to, "CASH"));
        BigDecimal card           = orZero(saleRepository.sumTodayByPaymentMethod(from, to, "CARD"));
        BigDecimal transfer       = orZero(saleRepository.sumTodayByPaymentMethod(from, to, "TRANSFER"));
        BigDecimal debt           = orZero(saleRepository.sumTodayByPaymentMethod(from, to, "DEBT"));
        BigDecimal returnedAmount = orZero(saleRepository.sumReturnedAmount(from, to));

        return TodayStatsResponse.builder()
                .saleCount(saleCount)
                .totalAmount(total)
                .totalDiscount(discount)
                .cancelledCount(cancelled)
                .returnedCount(returned)
                .returnedAmount(returnedAmount)
                .totalCash(cash)
                .totalCard(card)
                .totalTransfer(transfer)
                .totalDebt(debt)
                .build();
    }
}