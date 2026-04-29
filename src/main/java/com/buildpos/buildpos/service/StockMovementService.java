package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.StockMovementResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import com.buildpos.buildpos.entity.StockMovement;
import com.buildpos.buildpos.entity.enums.StockMovementType;
import com.buildpos.buildpos.repository.StockMovementRepository;
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
        return stockMovementRepository
                .findAllFiltered(productUnitId, productId, warehouseId, movementTypeStr, fromStr, toStr, productNameStr, pageable)
                .map(this::toResponse);
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
    private StockMovementResponse toResponse(StockMovement sm) {
        return StockMovementResponse.builder()
                .id(sm.getId())
                // Mahsulot
                .productUnitId(sm.getProductUnit().getId())
                .productName(sm.getProductUnit().getProduct().getName())
                .unitSymbol(sm.getProductUnit().getUnit().getSymbol())
                .barcode(sm.getProductUnit().getBarcode())
                // Harakat
                .movementType(sm.getMovementType())
                // Omborlar
                .fromWarehouseId(sm.getFromWarehouse() != null ? sm.getFromWarehouse().getId() : null)
                .fromWarehouseName(sm.getFromWarehouse() != null ? sm.getFromWarehouse().getName() : null)
                .toWarehouseId(sm.getToWarehouse() != null ? sm.getToWarehouse().getId() : null)
                .toWarehouseName(sm.getToWarehouse() != null ? sm.getToWarehouse().getName() : null)
                // Miqdor
                .quantity(sm.getQuantity())
                .unitPrice(sm.getUnitPrice())
                .totalPrice(sm.getTotalPrice())
                // Manba
                .referenceType(sm.getReferenceType())
                .referenceId(sm.getReferenceId())
                .notes(sm.getNotes())
                .movedAt(sm.getMovedAt())
                .movedBy(sm.getMovedBy() != null ? sm.getMovedBy().getUsername() : null)
                .build();
    }
}