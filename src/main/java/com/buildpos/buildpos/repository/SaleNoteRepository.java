package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.SaleNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaleNoteRepository extends JpaRepository<SaleNote, Long> {
    List<SaleNote> findAllBySaleIdOrderByCreatedAtAsc(Long saleId);
}