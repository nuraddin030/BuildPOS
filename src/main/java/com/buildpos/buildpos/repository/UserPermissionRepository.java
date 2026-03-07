package com.buildpos.buildpos.repository;

import com.buildpos.buildpos.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserPermissionRepository extends JpaRepository<UserPermission, Long> {

    @Query("SELECT up FROM UserPermission up JOIN FETCH up.permission WHERE up.user.id = :userId")
    List<UserPermission> findAllByUserId(@Param("userId") Long userId);

    Optional<UserPermission> findByUserIdAndPermissionId(Long userId, Long permissionId);

    boolean existsByUserIdAndPermissionId(Long userId, Long permissionId);

    void deleteByUserIdAndPermissionId(Long userId, Long permissionId);

    @Query("""
        SELECT up.permission.name FROM UserPermission up
        WHERE up.user.id = :userId
    """)
    List<String> findPermissionNamesByUserId(@Param("userId") Long userId);





}