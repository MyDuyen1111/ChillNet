package com.tien.identityservice.dto.request;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Lệnh khóa/mở khóa tài khoản do moderation-service gửi sang.
 * status nhận: ACTIVE, SUSPENDED, BANNED. suspendedUntil chỉ dùng với SUSPENDED.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AccountStatusRequest {
    String status;
    LocalDateTime suspendedUntil;
    String caseId;
    String reason;
}
