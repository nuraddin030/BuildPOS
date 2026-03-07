package com.buildpos.buildpos.security;

import com.buildpos.buildpos.entity.User;
import com.buildpos.buildpos.repository.UserPermissionRepository;
import com.buildpos.buildpos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.ArrayList;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserPermissionRepository userPermissionRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new UsernameNotFoundException("Foydalanuvchi topilmadi: " + username)
                );

        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName()));

        // LAZY muammosini hal qilish — permission.getName() ni to'g'ridan olamiz
        userPermissionRepository.findAllByUserId(user.getId())
                .forEach(up -> authorities.add(
                        new SimpleGrantedAuthority(up.getPermission().getName())
                ));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.getIsActive(),
                true, true, true,
                authorities
        );
    }
}