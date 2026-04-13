package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.request.EmployeeRequest;
import com.buildpos.buildpos.dto.request.GrantPermissionRequest;
import com.buildpos.buildpos.security.PasswordValidator;
import com.buildpos.buildpos.dto.response.EmployeeResponse;
import com.buildpos.buildpos.dto.response.PermissionGroupResponse;
import com.buildpos.buildpos.dto.response.PermissionResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.exception.AlreadyExistsException;
import com.buildpos.buildpos.exception.BadRequestException;
import com.buildpos.buildpos.exception.NotFoundException;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmployeeService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionGroupRepository permissionGroupRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PasswordEncoder passwordEncoder;

    // ─────────────────────────────────────────
    // XODIM QO'SHISH
    // ─────────────────────────────────────────
    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AlreadyExistsException("Bu username allaqachon mavjud: " + request.getUsername());
        }
        PasswordValidator.validate(request.getPassword());

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new NotFoundException("Rol topilmadi: " + request.getRoleId()));

        User user = User.builder()
                .fullName(request.getFullName())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(role)
                .isActive(true)
                .build();

        return toResponse(userRepository.save(user));
    }

    // ─────────────────────────────────────────
    // GET ALL
    // ─────────────────────────────────────────
    public Page<EmployeeResponse> getAll(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    // ─────────────────────────────────────────
    // GET BY ID
    // ─────────────────────────────────────────
    public EmployeeResponse getById(Long id) {
        return toResponse(findById(id));
    }

    // ─────────────────────────────────────────
    // O'Z PROFILIM (joriy foydalanuvchi)
    // ─────────────────────────────────────────
    public EmployeeResponse getMe(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi"));
        return toResponse(user);
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest request) {
        User user = findById(id);

        if (!user.getUsername().equals(request.getUsername()) &&
                userRepository.existsByUsername(request.getUsername())) {
            throw new AlreadyExistsException("Bu username allaqachon mavjud: " + request.getUsername());
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new NotFoundException("Rol topilmadi"));

        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setPhone(request.getPhone());
        user.setRole(role);

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            PasswordValidator.validate(request.getPassword());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return toResponse(userRepository.save(user));
    }

    // ─────────────────────────────────────────
    // TOGGLE STATUS
    // ─────────────────────────────────────────
    @Transactional
    public EmployeeResponse toggleStatus(Long id) {
        User user = findById(id);
        user.setIsActive(!user.getIsActive());
        return toResponse(userRepository.save(user));
    }

    // ─────────────────────────────────────────
    // PERMISSION BERISH
    // ─────────────────────────────────────────
    @Transactional
    public EmployeeResponse grantPermission(Long userId, GrantPermissionRequest request,
                                            String grantedByUsername) {
        User user = findById(userId);

        // OWNER va ADMIN ga permission berish shart emas
        String roleName = user.getRole().getName();
        if (roleName.equals("OWNER") || roleName.equals("ADMIN")) {
            throw new BadRequestException("OWNER va ADMIN rollari barcha huquqlarga ega");
        }

        Permission permission = permissionRepository.findById(request.getPermissionId())
                .orElseThrow(() -> new NotFoundException("Permission topilmadi"));

        if (userPermissionRepository.existsByUserIdAndPermissionId(userId, permission.getId())) {
            throw new AlreadyExistsException("Bu permission allaqachon berilgan");
        }

        User grantedBy = userRepository.findByUsername(grantedByUsername)
                .orElseThrow(() -> new NotFoundException("Foydalanuvchi topilmadi"));

        UserPermission userPermission = UserPermission.builder()
                .user(user)
                .permission(permission)
                .grantedAt(LocalDateTime.now())
                .grantedBy(grantedBy)
                .build();

        userPermissionRepository.save(userPermission);
        return toResponse(user);
    }

    // ─────────────────────────────────────────
    // PERMISSION OLISH
    // ─────────────────────────────────────────
    @Transactional
    public EmployeeResponse revokePermission(Long userId, Long permissionId) {
        findById(userId);

        if (!userPermissionRepository.existsByUserIdAndPermissionId(userId, permissionId)) {
            throw new NotFoundException("Bu permission foydalanuvchida yo'q");
        }

        userPermissionRepository.deleteByUserIdAndPermissionId(userId, permissionId);
        return toResponse(findById(userId));
    }

    // ─────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────
    private User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Xodim topilmadi: " + id));
    }

    private EmployeeResponse toResponse(User user) {
        String roleName = user.getRole().getName();
        boolean isOwnerOrAdmin = roleName.equals("OWNER") || roleName.equals("ADMIN");

        List<PermissionGroupResponse> permissionGroups;

        if (isOwnerOrAdmin) {
            // OWNER/ADMIN — barcha permissionlarni guruh bo'yicha qaytarish
            permissionGroups = buildAllPermissionGroups();
        } else {
            // Faqat berilgan permissionlar
            List<UserPermission> userPermissions = userPermissionRepository.findAllByUserId(user.getId());
            permissionGroups = buildUserPermissionGroups(userPermissions);
        }

        return EmployeeResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .phone(user.getPhone())
                .roleName(roleName)
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .permissionGroups(permissionGroups)
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .build();
    }

    private List<PermissionGroupResponse> buildAllPermissionGroups() {
        return permissionGroupRepository.findAllByOrderBySortOrderAsc().stream()
                .map(group -> PermissionGroupResponse.builder()
                        .id(group.getId())
                        .name(group.getName())
                        .labelUz(group.getLabelUz())
                        .labelEn(group.getLabelEn())
                        .sortOrder(group.getSortOrder())
                        .permissions(group.getPermissions().stream()
                                .map(this::toPermissionResponse)
                                .toList())
                        .build())
                .toList();
    }

    private List<PermissionGroupResponse> buildUserPermissionGroups(List<UserPermission> userPermissions) {
        // Guruh bo'yicha guruhlash
        Map<PermissionGroup, List<Permission>> grouped = new LinkedHashMap<>();

        for (UserPermission up : userPermissions) {
            Permission perm = up.getPermission();
            PermissionGroup group = perm.getGroup();
            grouped.computeIfAbsent(group, k -> new ArrayList<>()).add(perm);
        }

        return grouped.entrySet().stream()
                .map(entry -> PermissionGroupResponse.builder()
                        .id(entry.getKey().getId())
                        .name(entry.getKey().getName())
                        .labelUz(entry.getKey().getLabelUz())
                        .labelEn(entry.getKey().getLabelEn())
                        .sortOrder(entry.getKey().getSortOrder())
                        .permissions(entry.getValue().stream()
                                .map(this::toPermissionResponse)
                                .toList())
                        .build())
                .toList();
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
