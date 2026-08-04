package com.tien.identityservice.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.tien.identityservice.dto.ApiResponse;
import com.tien.identityservice.dto.request.ProfileCreationRequest;
import com.tien.identityservice.dto.request.UserCreationRequest;
import com.tien.identityservice.dto.response.UserProfileResponse;
import com.tien.identityservice.exception.AppException;
import com.tien.identityservice.exception.ErrorCode;
import com.tien.identityservice.mapper.ProfileMapper;
import com.tien.identityservice.repository.httpclient.ProfileClient;

import feign.FeignException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

// ProfileService: Service giao tiếp với profile-service để quản lý profile của user.

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProfileService {
    ProfileClient profileClient;

    ProfileMapper profileMapper;

    // Tạo profile mới bằng cách gọi profile-service qua Feign Client
    public UserProfileResponse createProfile(ProfileCreationRequest request) {
        try {
            ApiResponse<UserProfileResponse> response = profileClient.createProfile(request);
            if (response == null || response.getResult() == null) {
                log.error("Profile service trả về null response cho user: {}", request.getUserId());
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
            return response.getResult();
        } catch (FeignException e) {
            log.error("Lỗi khi gọi profile-service để tạo profile cho user: {}", request.getUserId(), e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    /**
     * Tạo profile ở luồng nền, có thử lại.
     *
     * <p>Dùng cho seed lúc khởi động: run-all.sh đợi identity-service lên hẳn rồi mới khởi động
     * profile-service, nên lần gọi đầu gần như chắc chắn thất bại vì chưa có ai nghe ở cổng 8082.
     * Chạy @Async để không chặn startup, và thử lại cho tới khi profile-service sẵn sàng.
     * createProfile phía profile-service là idempotent nên thử lại nhiều lần là an toàn.
     */
    @Async
    public void createProfileWithRetry(ProfileCreationRequest request, int maxAttempts, long delayMillis) {
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                createProfile(request);
                log.info("Đã tạo/xác nhận profile cho userId {} ở lần thử {}.", request.getUserId(), attempt);
                return;
            } catch (Exception e) {
                if (attempt == maxAttempts) {
                    log.error(
                            "Bỏ cuộc sau {} lần thử tạo profile cho userId {}. Tài khoản vẫn đăng nhập được nhưng trang cá nhân sẽ báo không tồn tại.",
                            maxAttempts,
                            request.getUserId(),
                            e);
                    return;
                }
                log.warn(
                        "Lần thử {}/{} tạo profile cho userId {} thất bại ({}). Thử lại sau {}ms.",
                        attempt,
                        maxAttempts,
                        request.getUserId(),
                        e.getMessage(),
                        delayMillis);
                try {
                    Thread.sleep(delayMillis);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    // Tạo profile từ UserCreationRequest (khi đăng ký)
    public UserProfileResponse createProfileFromCreation(UserCreationRequest request, String userId) {
        ProfileCreationRequest profileRequest = profileMapper.toProfileCreationRequest(request);
        profileRequest.setUserId(userId);

        // Đảm bảo username được set (MapStruct có thể không map nếu UserCreationRequest chỉ có @Getter)
        if (profileRequest.getUsername() == null || profileRequest.getUsername().isEmpty()) {
            profileRequest.setUsername(request.getUsername());
        }

        // Đảm bảo firstName và lastName được set vào profile
        // firstName có thể null, nhưng lastName nếu không có thì set bằng username
        if (request.getFirstName() != null && !request.getFirstName().trim().isEmpty()) {
            profileRequest.setFirstName(request.getFirstName().trim());
        }

        if (request.getLastName() != null && !request.getLastName().trim().isEmpty()) {
            profileRequest.setLastName(request.getLastName().trim());
        } else {
            // Nếu không có lastName, set bằng username
            profileRequest.setLastName(request.getUsername());
        }

        log.info(
                "Creating profile for userId: {}, firstName: {}, lastName: {}, username: {}",
                userId,
                profileRequest.getFirstName(),
                profileRequest.getLastName(),
                profileRequest.getUsername());

        return createProfile(profileRequest);
    }
}
