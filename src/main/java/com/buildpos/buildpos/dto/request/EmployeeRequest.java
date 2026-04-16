package com.buildpos.buildpos.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EmployeeRequest {

    @NotBlank
    @Size(max = 100)
    private String fullName;

    @NotBlank
    @Size(max = 50)
    private String username;

    @Size(min = 6, max = 50)
    private String password;

    @Size(max = 20)
    private String phone;

    @NotNull
    private Long roleId;
}