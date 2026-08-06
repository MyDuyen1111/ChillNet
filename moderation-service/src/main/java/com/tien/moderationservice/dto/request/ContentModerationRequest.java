package com.tien.moderationservice.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Lệnh gửi sang post-service/interaction-service để đổi trạng thái kiểm duyệt của nội dung.
 * status nhận: VISIBLE (khôi phục), LIMITED, HIDDEN, REMOVED.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContentModerationRequest {
    String status;
    String caseId;
    String reason;
}
