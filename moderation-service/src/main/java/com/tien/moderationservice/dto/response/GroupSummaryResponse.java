package com.tien.moderationservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

// Bản sao rút gọn của group bên group-service, chỉ lấy phần cần để xác định chủ sở hữu.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GroupSummaryResponse {
    String id;
    String name;
    String description;
    String ownerId;
}
