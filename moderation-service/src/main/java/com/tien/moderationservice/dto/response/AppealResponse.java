package com.tien.moderationservice.dto.response;

import java.time.LocalDateTime;

import com.tien.moderationservice.entity.AppealStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AppealResponse {
    String id;
    String caseId;
    String appellantId;
    String reason;
    AppealStatus status;
    String reviewerId;
    String reviewNote;
    LocalDateTime createdAt;
    LocalDateTime resolvedAt;
}
