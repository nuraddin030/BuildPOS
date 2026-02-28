package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.PermissionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PermissionGroupRepository extends JpaRepository<PermissionGroup, Long> {

    boolean existsByName(String name);

    List<PermissionGroup> findAllByOrderBySortOrderAsc();
}