package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.StockMovementResponse;
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
            Long warehouseId,
            StockMovementType movementType,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {

        return stockMovementRepository
                .findAllFiltered(productUnitId, warehouseId, movementType, from, to, pageable)
                .map(this::toResponse);
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
