package com.tien.moderationservice.dto.request;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Lệnh gửi sang identity-service để khóa/mở khóa tài khoản.
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
