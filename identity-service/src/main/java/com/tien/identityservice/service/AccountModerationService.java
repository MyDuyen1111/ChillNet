package com.tien.identityservice.service;

import java.time.LocalDateTime;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tien.identityservice.constant.AccountStatus;
import com.tien.identityservice.dto.request.AccountStatusRequest;
import com.tien.identityservice.dto.response.UserAccountResponse;
import com.tien.identityservice.entity.User;
import com.tien.identityservice.exception.AppException;
import com.tien.identityservice.exception.ErrorCode;
import com.tien.identityservice.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Khóa/mở khóa tài khoản theo quyết định của moderation-service, và kiểm tra trạng thái đó
 * mỗi khi tài khoản đăng nhập hoặc dùng token.
 *
 * Không có bảng lưu JWT ID đang phát hành nên không thể thu hồi trực tiếp token cũ;
 * thay vào đó việc kiểm tra được đặt trong luồng introspect — gateway gọi introspect cho mọi
 * request nên tài khoản bị khóa mất quyền ngay lập tức chứ không phải chờ token hết hạn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AccountModerationService {

    UserRepository userRepository;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void updateStatus(String userId, AccountStatusRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        AccountStatus status;
        try {
            status = AccountStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new AppException(ErrorCode.INVALID_ACCOUNT_STATUS);
        }

        user.setStatus(status);
        user.setSuspendedUntil(status == AccountStatus.SUSPENDED ? request.getSuspendedUntil() : null);
        user.setStatusReason(status == AccountStatus.ACTIVE ? null : request.getReason());
        user.setModerationCaseId(status == AccountStatus.ACTIVE ? null : request.getCaseId());
        userRepository.save(user);

        log.info(
                "Tài khoản {} chuyển sang trạng thái {} (đến {}, hồ sơ {})",
                userId,
                status,
                user.getSuspendedUntil(),
                request.getCaseId());
    }

    public UserAccountResponse getAccount(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        AccountStatus status = effectiveStatus(user);

        return UserAccountResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .status(status.name())
                .suspendedUntil(status == AccountStatus.SUSPENDED ? user.getSuspendedUntil() : null)
                .build();
    }

    /**
     * Chặn tài khoản đang bị khóa. Gọi ở cả lúc đăng nhập lẫn lúc kiểm tra token.
     * Lệnh khóa hết hạn được tự động gỡ tại đây thay vì cần một job chạy nền.
     */
    @Transactional
    public void assertUsable(User user) {
        AccountStatus status = effectiveStatus(user);

        if (status == AccountStatus.ACTIVE) {
            // Hết hạn khóa thì trả tài khoản về ACTIVE ngay lần chạm đầu tiên.
            if (user.getStatus() == AccountStatus.SUSPENDED) {
                user.setStatus(AccountStatus.ACTIVE);
                user.setSuspendedUntil(null);
                user.setStatusReason(null);
                userRepository.save(user);
                log.info("Tài khoản {} đã hết hạn khóa, tự động mở lại", user.getId());
            }
            return;
        }

        if (status == AccountStatus.BANNED) {
            throw new AppException(ErrorCode.ACCOUNT_BANNED);
        }
        throw new AppException(ErrorCode.ACCOUNT_SUSPENDED);
    }

    public void assertUsable(String userId) {
        userRepository.findById(userId).ifPresent(this::assertUsable);
    }

    // Trạng thái thực tế: SUSPENDED đã qua hạn thì coi như ACTIVE.
    private AccountStatus effectiveStatus(User user) {
        AccountStatus status = user.getStatus() != null ? user.getStatus() : AccountStatus.ACTIVE;
        if (status == AccountStatus.SUSPENDED
                && user.getSuspendedUntil() != null
                && user.getSuspendedUntil().isBefore(LocalDateTime.now())) {
            return AccountStatus.ACTIVE;
        }
        return status;
    }
}
