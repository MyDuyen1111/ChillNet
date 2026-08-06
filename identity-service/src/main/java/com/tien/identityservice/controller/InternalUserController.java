package com.tien.identityservice.controller;

import org.springframework.web.bind.annotation.*;

import com.tien.identityservice.dto.ApiResponse;
import com.tien.identityservice.dto.request.AccountStatusRequest;
import com.tien.identityservice.dto.response.UserAccountResponse;
import com.tien.identityservice.service.AccountModerationService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * Endpoint nội bộ cho moderation-service.
 *
 * Khác các service khác, SecurityConfig của identity-service KHÔNG permitAll /internal/**,
 * nên cả hai endpoint dưới đây đều đòi JWT hợp lệ; moderation-service forward token của
 * kiểm duyệt viên khi gọi sang. Việc đổi trạng thái tài khoản còn được chặn thêm bằng
 * @PreAuthorize("hasRole('ADMIN')") ở AccountModerationService.
 */
@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/internal/users")
public class InternalUserController {
    AccountModerationService accountModerationService;

    @GetMapping("/{userId}")
    ApiResponse<UserAccountResponse> getAccount(@PathVariable String userId) {
        return ApiResponse.<UserAccountResponse>builder()
                .result(accountModerationService.getAccount(userId))
                .build();
    }

    @PostMapping("/{userId}/status")
    ApiResponse<Void> updateStatus(@PathVariable String userId, @RequestBody AccountStatusRequest request) {
        accountModerationService.updateStatus(userId, request);
        return ApiResponse.<Void>builder()
                .message("Đã cập nhật trạng thái tài khoản")
                .build();
    }
}
