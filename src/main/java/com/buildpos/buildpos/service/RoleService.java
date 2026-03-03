package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.RoleResponse;
import com.buildpos.buildpos.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleService {

    private final RoleRepository roleRepository;

    public List<RoleResponse> getAll() {
        return roleRepository.findAllByOrderByIdAsc()
                .stream()
                .map(role -> RoleResponse.builder()
                        .id(role.getId())
                        .name(role.getName())
                        .createdAt(role.getCreatedAt())
                        .build())
                .toList();
    }
}
