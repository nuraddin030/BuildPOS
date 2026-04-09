package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.InventoryCreateRequest;
import com.buildpos.buildpos.dto.request.InventoryItemUpdateRequest;
import com.buildpos.buildpos.dto.request.StockAdjustmentRequest;
import com.buildpos.buildpos.dto.response.InventorySessionResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventorySessionRepository sessionRepository;
    private final InventoryItemRepository itemRepository;
    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    // ── Ro'yxat ───────────────────────────────────────────────────
    public Page<InventorySessionResponse> getAll(Pageable pageable) {
        return sessionRepository.findAllByOrderByCreatedAtAsc(pageable)
                .map(s -> toSummary(s));
    }

    // ── Bitta sessiya (items bilan) ────────────────────────────────
    @Transactional(readOnly = true)
    public InventorySessionResponse getById(Long id) {
        InventorySession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Inventarizatsiya topilmadi"));
        List<InventoryItem> items = itemRepository.findAllBySessionIdOrderByProductNameAsc(id);
        return toResponse(session, items);
    }

    // ── Yangi sessiya yaratish ─────────────────────────────────────
    @Transactional
    public InventorySessionResponse create(InventoryCreateRequest request, String username) {
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new NotFoundException("Ombor topilmadi"));

        User user = userRepository.findByUsername(username).orElse(null);

        InventorySession session = InventorySession.builder()
                .warehouse(warehouse)
                .warehouseName(warehouse.getName())
                .status("DRAFT")
                .notes(request.getNotes())
                .createdBy(user)
                .createdByName(user != null ? user.getFullName() : username)
                .createdAt(LocalDateTime.now())
                .build();

        sessionRepository.save(session);

        // Ombordan hozirgi stocklarni o'qib, inventarizatsiya itemlar sifatida yozamiz
        List<WarehouseStock> stocks = warehouseStockRepository.findAllByWarehouseId(warehouse.getId());
        for (WarehouseStock ws : stocks) {
            ProductUnit pu = ws.getProductUnit();
            if (pu == null || pu.getProduct() == null) continue;
            if (Boolean.TRUE.equals(pu.getProduct().getIsDeleted())) continue;

            InventoryItem item = InventoryItem.builder()
                    .session(session)
                    .productUnit(pu)
                    .productName(pu.getProduct().getName())
                    .unitSymbol(pu.getUnit() != null ? pu.getUnit().getSymbol() : "")
                    .systemQty(ws.getQuantity() != null ? ws.getQuantity() : BigDecimal.ZERO)
                    .build();
            itemRepository.save(item);
        }

        return getById(session.getId());
    }

    // ── Item actual_qty yangilash ──────────────────────────────────
    @Transactional
    public InventorySessionResponse updateItem(Long sessionId, Long itemId,
                                               InventoryItemUpdateRequest request) {
        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Item topilmadi"));

        if (!item.getSession().getId().equals(sessionId)) {
            throw new BadRequestException("Item bu sessiyaga tegishli emas");
        }
        if (!"DRAFT".equals(item.getSession().getStatus())) {
            throw new BadRequestException("Yakunlangan inventarizatsiyani o'zgartirib bo'lmaydi");
        }

        item.setActualQty(request.getActualQty());
        item.setNotes(request.getNotes());
        itemRepository.save(item);

        return getById(sessionId);
    }

    // ── Yakunlash — farqlarni stock ga kiritish ────────────────────
    @Transactional
    public InventorySessionResponse complete(Long sessionId, String username) {
        InventorySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Inventarizatsiya topilmadi"));

        if (!"DRAFT".equals(session.getStatus())) {
            throw new BadRequestException("Allaqachon yakunlangan");
        }

        List<InventoryItem> items = itemRepository.findAllBySessionIdOrderByProductNameAsc(sessionId);
        long filledCount = items.stream().filter(i -> i.getActualQty() != null).count();
        if (filledCount == 0) {
            throw new BadRequestException("Hech bir mahsulotning haqiqiy miqdori kiritilmagan");
        }

        User user = userRepository.findByUsername(username).orElse(null);

        for (InventoryItem item : items) {
            if (item.getActualQty() == null) continue;

            BigDecimal diff = item.getActualQty().subtract(item.getSystemQty());
            if (diff.compareTo(BigDecimal.ZERO) == 0) continue;

            StockAdjustmentRequest adj = new StockAdjustmentRequest();
            adj.setProductUnitId(item.getProductUnit().getId());
            adj.setWarehouseId(session.getWarehouse().getId());
            adj.setNotes("Inventarizatsiya #" + sessionId);

            if (diff.compareTo(BigDecimal.ZERO) > 0) {
                adj.setMovementType(StockMovementType.ADJUSTMENT_IN);
                adj.setQuantity(diff);
            } else {
                adj.setMovementType(StockMovementType.ADJUSTMENT_OUT);
                adj.setQuantity(diff.abs());
            }

            productService.adjustStock(adj);
        }

        session.setStatus("COMPLETED");
        session.setCompletedBy(user);
        session.setCompletedByName(user != null ? user.getFullName() : username);
        session.setCompletedAt(LocalDateTime.now());
        sessionRepository.save(session);

        return toResponse(session, items);
    }

    // ── O'chirish (faqat DRAFT) ────────────────────────────────────
    @Transactional
    public void delete(Long sessionId) {
        InventorySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Inventarizatsiya topilmadi"));
        if (!"DRAFT".equals(session.getStatus())) {
            throw new BadRequestException("Yakunlangan inventarizatsiyani o'chirib bo'lmaydi");
        }
        sessionRepository.delete(session);
    }

    // ── Mapping ───────────────────────────────────────────────────
    private InventorySessionResponse toSummary(InventorySession s) {
        return InventorySessionResponse.builder()
                .id(s.getId())
                .warehouseId(s.getWarehouse() != null ? s.getWarehouse().getId() : null)
                .warehouseName(s.getWarehouseName())
                .status(s.getStatus())
                .notes(s.getNotes())
                .createdByName(s.getCreatedByName())
                .completedByName(s.getCompletedByName())
                .createdAt(s.getCreatedAt())
                .completedAt(s.getCompletedAt())
                .totalItems(0)
                .filledItems(0)
                .build();
    }

    private InventorySessionResponse toResponse(InventorySession s, List<InventoryItem> items) {
        int filled = (int) items.stream().filter(i -> i.getActualQty() != null).count();

        List<InventorySessionResponse.ItemDto> itemDtos = items.stream().map(i -> {
            BigDecimal diff = i.getActualQty() != null
                    ? i.getActualQty().subtract(i.getSystemQty())
                    : null;
            return InventorySessionResponse.ItemDto.builder()
                    .id(i.getId())
                    .productUnitId(i.getProductUnit().getId())
                    .productName(i.getProductName())
                    .unitSymbol(i.getUnitSymbol())
                    .systemQty(i.getSystemQty())
                    .actualQty(i.getActualQty())
                    .difference(diff)
                    .notes(i.getNotes())
                    .build();
        }).toList();

        return InventorySessionResponse.builder()
                .id(s.getId())
                .warehouseId(s.getWarehouse() != null ? s.getWarehouse().getId() : null)
                .warehouseName(s.getWarehouseName())
                .status(s.getStatus())
                .notes(s.getNotes())
                .createdByName(s.getCreatedByName())
                .completedByName(s.getCompletedByName())
                .createdAt(s.getCreatedAt())
                .completedAt(s.getCompletedAt())
                .totalItems(items.size())
                .filledItems(filled)
                .items(itemDtos)
                .build();
    }
}