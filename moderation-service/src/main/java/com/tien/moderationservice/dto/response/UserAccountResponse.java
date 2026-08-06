package com.tien.moderationservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

// Bản sao rút gọn của user bên identity-service, lấy qua /internal/users/{userId}.
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
}
