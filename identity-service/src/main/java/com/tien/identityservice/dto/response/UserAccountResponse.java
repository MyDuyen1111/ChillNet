package com.tien.identityservice.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

// Thông tin tối thiểu của tài khoản trả về cho moderation-service qua /internal.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserAccountResponse {
    String id;
    String username;
    String email;
    String status;
    LocalDateTime suspendedUntil;
}
