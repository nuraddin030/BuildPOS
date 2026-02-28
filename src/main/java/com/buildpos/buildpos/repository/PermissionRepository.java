package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

    boolean existsByName(String name);

    List<Permission> findAllByGroupIdOrderBySortOrder(Long groupId);

    List<Permission> findAllByOrderByGroupIdAscSortOrderAsc();
}
