package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.StockMovementResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import com.buildpos.buildpos.entity.StockMovement;
import com.buildpos.buildpos.entity.Purchase;
import com.buildpos.buildpos.entity.Sale;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.repository.StockMovementRepository;
import com.buildpos.buildpos.repository.PurchaseRepository;
import com.buildpos.buildpos.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final PurchaseRepository purchaseRepository;
    private final SaleRepository saleRepository;

    // ─────────────────────────────────────────
    // GET ALL (barcha filterlar bilan)
    // ─────────────────────────────────────────
    public Page<StockMovementResponse> getAll(
            Long productUnitId,
            Long productId,
            Long warehouseId,
            StockMovementType movementType,
            LocalDateTime from,
            LocalDateTime to,
            String productName,
            Pageable pageable) {

        String movementTypeStr = movementType != null ? movementType.name() : null;
        String fromStr = from != null ? from.toString() : null;
        String toStr   = to   != null ? to.toString()   : null;
        String productNameStr = (productName != null && !productName.isBlank()) ? productName : null;
        Page<StockMovement> page = stockMovementRepository
                .findAllFiltered(productUnitId, productId, warehouseId, movementTypeStr, fromStr, toStr, productNameStr, pageable);

        Set<Long> purchaseIds = page.getContent().stream()
                .filter(sm -> "PURCHASE".equals(sm.getReferenceType()) && sm.getReferenceId() != null)
                .map(StockMovement::getReferenceId).collect(Collectors.toSet());
        Set<Long> saleIds = page.getContent().stream()
                .filter(sm -> "SALE".equals(sm.getReferenceType()) && sm.getReferenceId() != null)
                .map(StockMovement::getReferenceId).collect(Collectors.toSet());

        Map<Long, String> purchaseRefMap = purchaseIds.isEmpty() ? Map.of()
                : purchaseRepository.findAllById(purchaseIds).stream()
                    .collect(Collectors.toMap(Purchase::getId, Purchase::getReferenceNo));
        Map<Long, String> saleRefMap = saleIds.isEmpty() ? Map.of()
                : saleRepository.findAllById(saleIds).stream()
                    .collect(Collectors.toMap(Sale::getId, Sale::getReferenceNo));

        return page.map(sm -> toResponse(sm, purchaseRefMap, saleRefMap));
    }

    // ─────────────────────────────────────────
    // GET COUNTS — har bir type bo'yicha jami son
    // ─────────────────────────────────────────
    public Map<String, Long> getCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        // Barcha typelarni 0 bilan initsializatsiya
        for (StockMovementType type : StockMovementType.values()) {
            counts.put(type.name(), 0L);
        }
        // DB dan kelgan sonlarni ustiga yozish
        stockMovementRepository.countByMovementType().forEach(row -> {
            String type = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            counts.put(type, count);
        });
        return counts;
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private StockMovementResponse toResponse(StockMovement sm, Map<Long, String> purchaseRefMap, Map<Long, String> saleRefMap) {
        String refNo = null;
        if (sm.getReferenceId() != null) {
            if ("PURCHASE".equals(sm.getReferenceType())) {
                refNo = purchaseRefMap.get(sm.getReferenceId());
            } else if ("SALE".equals(sm.getReferenceType())) {
                refNo = saleRefMap.get(sm.getReferenceId());
            }
        }

        return StockMovementResponse.builder()
                .id(sm.getId())
                .productUnitId(sm.getProductUnit().getId())
                .productName(sm.getProductUnit().getProduct().getName())
                .unitSymbol(sm.getProductUnit().getUnit().getSymbol())
                .barcode(sm.getProductUnit().getBarcode())
                .movementType(sm.getMovementType())
                .fromWarehouseId(sm.getFromWarehouse() != null ? sm.getFromWarehouse().getId() : null)
                .fromWarehouseName(sm.getFromWarehouse() != null ? sm.getFromWarehouse().getName() : null)
                .toWarehouseId(sm.getToWarehouse() != null ? sm.getToWarehouse().getId() : null)
                .toWarehouseName(sm.getToWarehouse() != null ? sm.getToWarehouse().getName() : null)
                .quantity(sm.getQuantity())
                .unitPrice(sm.getUnitPrice())
                .totalPrice(sm.getTotalPrice())
                .referenceType(sm.getReferenceType())
                .referenceId(sm.getReferenceId())
                .referenceNo(refNo)
                .notes(sm.getNotes())
                .movedAt(sm.getMovedAt())
                .movedBy(sm.getMovedBy() != null ? sm.getMovedBy().getUsername() : null)
                .build();
    }
}