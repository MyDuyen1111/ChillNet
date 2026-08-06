package com.tien.moderationservice.dto.response;

import java.time.LocalDateTime;

import com.tien.moderationservice.entity.CaseSeverity;
import com.tien.moderationservice.entity.ReportReason;
import com.tien.moderationservice.entity.ReportStatus;
import com.tien.moderationservice.entity.TargetType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportResponse {
    String id;
    String reporterId;
    TargetType targetType;
    String targetId;
    String targetOwnerId;
    ReportReason reason;
    String description;
    ReportStatus status;
    CaseSeverity severity;
    String caseId;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
