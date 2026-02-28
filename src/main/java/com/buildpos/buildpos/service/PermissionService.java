package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.PermissionGroupRequest;
import com.buildpos.buildpos.dto.request.PermissionRequest;
import com.buildpos.buildpos.dto.response.PermissionGroupResponse;
import com.buildpos.buildpos.dto.response.PermissionResponse;
import com.buildpos.buildpos.entity.Permission;
import com.buildpos.buildpos.entity.PermissionGroup;
import com.buildpos.buildpos.exception.AlreadyExistsException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.PermissionGroupRepository;
import com.buildpos.buildpos.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final PermissionGroupRepository permissionGroupRepository;

    // ─────────────────────────────────────────
    // GURUH YARATISH
    // ─────────────────────────────────────────
    @Transactional
    public PermissionGroupResponse createGroup(PermissionGroupRequest request) {
        if (permissionGroupRepository.existsByName(request.getName())) {
            throw new AlreadyExistsException("Bu guruh allaqachon mavjud: " + request.getName());
        }

        PermissionGroup group = PermissionGroup.builder()
                .name(request.getName().toUpperCase())
                .labelUz(request.getLabelUz())
                .labelEn(request.getLabelEn())
                .sortOrder(request.getSortOrder())
                .build();

        return toGroupResponse(permissionGroupRepository.save(group));
    }

    // ─────────────────────────────────────────
    // BARCHA GURUHLAR (permissionlar bilan)
    // ─────────────────────────────────────────
    public List<PermissionGroupResponse> getAllGroups() {
        return permissionGroupRepository.findAllByOrderBySortOrderAsc()
                .stream()
                .map(this::toGroupResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // PERMISSION YARATISH
    // ─────────────────────────────────────────
    @Transactional
    public PermissionResponse createPermission(PermissionRequest request) {
        if (permissionRepository.existsByName(request.getName())) {
            throw new AlreadyExistsException("Bu permission allaqachon mavjud: " + request.getName());
        }

        PermissionGroup group = permissionGroupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new NotFoundException("Guruh topilmadi: " + request.getGroupId()));

        Permission permission = Permission.builder()
                .group(group)
                .name(request.getName().toUpperCase())
                .type(request.getType())
                .labelUz(request.getLabelUz())
                .labelEn(request.getLabelEn())
                .sortOrder(request.getSortOrder())
                .build();

        return toPermissionResponse(permissionRepository.save(permission));
    }

    // ─────────────────────────────────────────
    // BARCHA PERMISSIONLAR
    // ─────────────────────────────────────────
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAllByOrderByGroupIdAscSortOrderAsc()
                .stream()
                .map(this::toPermissionResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // GURUH BO'YICHA PERMISSIONLAR
    // ─────────────────────────────────────────
    public List<PermissionResponse> getByGroup(Long groupId) {
        permissionGroupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Guruh topilmadi: " + groupId));

        return permissionRepository.findAllByGroupIdOrderBySortOrder(groupId)
                .stream()
                .map(this::toPermissionResponse)
                .toList();
    }

    // ─────────────────────────────────────────
    // PERMISSION O'CHIRISH
    // ─────────────────────────────────────────
    @Transactional
    public void deletePermission(Long id) {
        permissionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Permission topilmadi: " + id));
        permissionRepository.deleteById(id);
    }

    // ─────────────────────────────────────────
    // GURUH O'CHIRISH
    // ─────────────────────────────────────────
    @Transactional
    public void deleteGroup(Long id) {
        permissionGroupRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Guruh topilmadi: " + id));
        permissionGroupRepository.deleteById(id);
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private PermissionGroupResponse toGroupResponse(PermissionGroup group) {
        return PermissionGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .labelUz(group.getLabelUz())
                .labelEn(group.getLabelEn())
                .sortOrder(group.getSortOrder())
                .permissions(group.getPermissions().stream()
                        .map(this::toPermissionResponse)
                        .toList())
                .build();
    }

    private PermissionResponse toPermissionResponse(Permission permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .groupId(permission.getGroup().getId())
                .groupName(permission.getGroup().getName())
                .name(permission.getName())
                .type(permission.getType())
                .labelUz(permission.getLabelUz())
                .labelEn(permission.getLabelEn())
                .sortOrder(permission.getSortOrder())
                .createdAt(permission.getCreatedAt())
                .build();
    }
}