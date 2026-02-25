package com.buildpos.buildpos.controller;

import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    // GET /api/suppliers
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STOREKEEPER')")
    public ResponseEntity<List<Supplier>> getAll() {
        return ResponseEntity.ok(supplierService.getAll());
    }

    // GET /api/suppliers/search?name=akbar
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STOREKEEPER')")
    public ResponseEntity<List<Supplier>> search(@RequestParam String name) {
        return ResponseEntity.ok(supplierService.search(name));
    }

    // GET /api/suppliers/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STOREKEEPER')")
    public ResponseEntity<Supplier> getById(@PathVariable Long id) {
        return supplierService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/suppliers
    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<Supplier> create(@RequestBody Supplier supplier) {
        return ResponseEntity.ok(supplierService.create(supplier));
    }

    // PUT /api/suppliers/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<Supplier> update(@PathVariable Long id,
                                           @RequestBody Supplier supplier) {
        supplier.setId(id);
        return ResponseEntity.ok(supplierService.update(supplier));
    }

    // DELETE /api/suppliers/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // GET /api/suppliers/{id}/debts
    @GetMapping("/{id}/debts")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<?> getDebts(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getDebts(id));
    }

    // GET /api/suppliers/{id}/total-debt
    @GetMapping("/{id}/total-debt")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<?> getTotalDebt(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getTotalDebt(id));
    }
}
