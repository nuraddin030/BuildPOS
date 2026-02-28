package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Shift;
import com.buildpos.buildpos.entity.enums.ShiftStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    // Kassirning ochiq smenasi
    Optional<Shift> findByCashierIdAndStatus(Long cashierId, ShiftStatus status);

    Page<Shift> findAllByCashierIdOrderByOpenedAtDesc(Long cashierId, Pageable pageable);

    Page<Shift> findAllByOrderByOpenedAtDesc(Pageable pageable);
}
