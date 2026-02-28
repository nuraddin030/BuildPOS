package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.WarehouseRequest;
import com.buildpos.buildpos.dto.response.WarehouseResponse;
import com.buildpos.buildpos.entity.Warehouse;
import com.buildpos.buildpos.entity.WarehouseStock;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.WarehouseRepository;
import com.buildpos.buildpos.repository.WarehouseStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @Transactional
    public WarehouseResponse create(WarehouseRequest request) {
        Warehouse warehouse = Warehouse.builder()
                .name(request.getName())
                .address(request.getAddress())
                .isDefault(false)
                .isActive(true)
                .build();

        return toResponse(warehouseRepository.save(warehouse));
    }

    // ─────────────────────────────────────────
    // GET ALL (faqat active)
    // ─────────────────────────────────────────
    public List<WarehouseResponse> getAllActive() {
        return warehouseRepository.findAllByIsActiveTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // GET ALL (admin uchun — inactive ham)
    // ─────────────────────────────────────────
    public List<WarehouseResponse> getAll() {
        return warehouseRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public WarehouseResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    @Transactional
    public WarehouseResponse update(Long id, WarehouseRequest request) {
        Warehouse warehouse = findById(id);
        warehouse.setName(request.getName());
        warehouse.setAddress(request.getAddress());
        return toResponse(warehouseRepository.save(warehouse));
    }

    // ─────────────────────────────────────────
    // SET DEFAULT
    // ─────────────────────────────────────────
    @Transactional
    public WarehouseResponse setDefault(Long id) {
        Warehouse newDefault = findById(id);

        if (!newDefault.getIsActive()) {
            throw new BadRequestException("Inactive ombor default qilib bo'lmaydi");
        }

        // Avvalgi default'ni olib tashlash
        warehouseRepository.findByIsDefaultTrue()
                .ifPresent(w -> {
                    w.setIsDefault(false);
                    warehouseRepository.save(w);
                });

        newDefault.setIsDefault(true);
        return toResponse(warehouseRepository.save(newDefault));
    }

    // ─────────────────────────────────────────
    // TOGGLE STATUS
    // ─────────────────────────────────────────
    @Transactional
    public WarehouseResponse toggleStatus(Long id) {
        Warehouse warehouse = findById(id);

        // Default ombor deaktiv qilib bo'lmaydi
        if (Boolean.TRUE.equals(warehouse.getIsDefault()) && warehouse.getIsActive()) {
            throw new BadRequestException(
                    "Default ombor deaktiv qilib bo'lmaydi. Avval boshqa ombor'ni default qiling."
            );
        }

        warehouse.setIsActive(!warehouse.getIsActive());
        return toResponse(warehouseRepository.save(warehouse));
    }

    // ─────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────
    @Transactional
    public void delete(Long id) {
        Warehouse warehouse = findById(id);

        if (Boolean.TRUE.equals(warehouse.getIsDefault())) {
            throw new BadRequestException("Default ombor o'chirib bo'lmaydi.");
        }

        // Bu omborda mahsulot qoldig'i bormi?
        List<WarehouseStock> stocks = warehouseStockRepository.findAllByWarehouseId(id);
        boolean hasStock = stocks.stream()
                .anyMatch(ws -> ws.getQuantity().signum() > 0);

        if (hasStock) {
            throw new BadRequestException(
                    "Bu omborda mahsulot qoldig'i bor, o'chirib bo'lmaydi. " +
                            "Avval mahsulotlarni boshqa ombor'ga o'tkazing."
            );
        }

        warehouseRepository.delete(warehouse);
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private Warehouse findById(Long id) {
        return warehouseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ombor topilmadi: " + id));
    }

    private WarehouseResponse toResponse(Warehouse warehouse) {
        return WarehouseResponse.builder()
                .id(warehouse.getId())
                .name(warehouse.getName())
                .address(warehouse.getAddress())
                .isDefault(warehouse.getIsDefault())
                .isActive(warehouse.getIsActive())
                .createdAt(warehouse.getCreatedAt())
                .createdBy(warehouse.getCreatedBy() != null
                        ? warehouse.getCreatedBy().getUsername()
                        : null)
                .build();
    }
}
