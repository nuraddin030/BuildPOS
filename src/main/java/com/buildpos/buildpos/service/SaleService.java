package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.SaleRequest;
import com.buildpos.buildpos.dto.response.SaleResponse;
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
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

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

        // Hamkor
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

        return toResponse(saleRepository.save(sale));
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

        // Stock tekshirish
        for (SaleItem item : sale.getItems()) {
            WarehouseStock stock = warehouseStockRepository
                    .findByWarehouseIdAndProductUnitId(
                            item.getWarehouse().getId(), item.getProductUnit().getId())
                    .orElseThrow(() -> new BadRequestException(
                            item.getProductUnit().getProduct().getName() + " omborda mavjud emas"));

            if (stock.getQuantity().compareTo(item.getQuantity()) < 0) {
                throw new BadRequestException(
                        item.getProductUnit().getProduct().getName()
                                + " uchun yetarli tovar yo'q. Mavjud: "
                                + stock.getQuantity() + " " + item.getProductUnit().getUnit().getSymbol()
                );
            }
        }

        // To'lovlar
        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal debtAmount = BigDecimal.ZERO;

        java.time.LocalDate debtDueDate = null;
        for (SaleRequest.SalePaymentRequest paymentReq : payments) {
            SalePayment payment = SalePayment.builder()
                    .sale(sale)
                    .paymentMethod(paymentReq.getPaymentMethod())
                    .amount(paymentReq.getAmount())
                    .notes(paymentReq.getNotes())
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

        // Kassir
        User cashier = userRepository.findByUsername(cashierUsername)
                .orElseThrow(() -> new NotFoundException("Kassir topilmadi"));
        sale.setCashier(cashier);

        shiftRepository.findByCashierIdAndStatus(cashier.getId(), ShiftStatus.OPEN)
                .ifPresent(sale::setShift);

        // Stock kamaytirish
        for (SaleItem item : sale.getItems()) {
            WarehouseStock stock = warehouseStockRepository
                    .findByWarehouseIdAndProductUnitId(
                            item.getWarehouse().getId(), item.getProductUnit().getId())
                    .orElseThrow();

            stock.setQuantity(stock.getQuantity().subtract(item.getQuantity()));
            warehouseStockRepository.save(stock);

            StockMovement movement = StockMovement.builder()
                    .productUnit(item.getProductUnit())
                    .movementType(StockMovementType.SALE_OUT)
                    .fromWarehouse(item.getWarehouse())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getSalePrice())
                    .totalPrice(item.getTotalPrice())
                    .referenceType("SALE")
                    .referenceId(sale.getId())
                    .build();
            stockMovementRepository.save(movement);
        }

        // Nasiya
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

        // Shift hisoboti
        if (sale.getShift() != null) {
            updateShiftReport(sale.getShift(), sale, payments);
        }

        sale.setStatus(SaleStatus.COMPLETED);
        sale.setCompletedAt(LocalDateTime.now());

        return toResponse(saleRepository.save(sale));
    }

    // ─────────────────────────────────────────
    // BEKOR QILISH
    // ─────────────────────────────────────────
    @Transactional
    public SaleResponse cancel(Long id) {
        Sale sale = findById(id);
        if (sale.getStatus() != SaleStatus.DRAFT) {
            throw new BadRequestException("Faqat DRAFT statusdagi savatchani bekor qilish mumkin");
        }
        sale.setStatus(SaleStatus.CANCELLED);
        return toResponse(saleRepository.save(sale));
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
        return saleRepository.findAllFiltered(sellerId, customerId, status, from, to, pageable)
                .map(this::toResponse);
    }

    public Page<SaleResponse> getMyHistory(String username, SaleStatus status,
                                           LocalDateTime from, LocalDateTime to, Pageable pageable) {
        User seller = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi"));
        return saleRepository.findAllFiltered(seller.getId(), null, status, from, to, pageable)
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
            return base.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        return value.min(base);
    }

    private void updateShiftReport(Shift shift, Sale sale,
                                   List<SaleRequest.SalePaymentRequest> payments) {
        shift.setTotalSales(shift.getTotalSales().add(sale.getTotalAmount()));
        shift.setSaleCount(shift.getSaleCount() + 1);
        for (SaleRequest.SalePaymentRequest p : payments) {
            switch (p.getPaymentMethod()) {
                case CASH     -> shift.setTotalCash(shift.getTotalCash().add(p.getAmount()));
                case CARD     -> shift.setTotalCard(shift.getTotalCard().add(p.getAmount()));
                case TRANSFER -> shift.setTotalTransfer(shift.getTotalTransfer().add(p.getAmount()));
                case DEBT     -> shift.setTotalDebt(shift.getTotalDebt().add(p.getAmount()));
            }
        }
        shiftRepository.save(shift);
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
                            .availableStock(stock)
                            .build();
                }).toList())
                .payments(sale.getPayments().stream().map(p ->
                        SaleResponse.SalePaymentResponse.builder()
                                .id(p.getId())
                                .paymentMethod(p.getPaymentMethod())
                                .amount(p.getAmount())
                                .notes(p.getNotes())
                                .build()).toList())
                .build();
    }
}