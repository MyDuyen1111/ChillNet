package com.tien.interactionservice.dto.request;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * Lệnh kiểm duyệt do moderation-service gửi sang.
 * status nhận: VISIBLE, LIMITED, HIDDEN, REMOVED.
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
