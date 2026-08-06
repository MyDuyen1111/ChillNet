package com.tien.moderationservice.dto.response;

import java.time.LocalDateTime;

import com.tien.moderationservice.entity.CaseSeverity;
import com.tien.moderationservice.entity.CaseStatus;
import com.tien.moderationservice.entity.ModerationAction;
import com.tien.moderationservice.entity.TargetType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModerationCaseResponse {
    String id;
    TargetType targetType;
    String targetId;
    String targetOwnerId;
    CaseStatus status;
    CaseSeverity severity;
    int reportCount;
    String assigneeId;
    ModerationAction action;
    String decisionNote;
    String decidedBy;
    LocalDateTime decidedAt;
    LocalDateTime suspendedUntil;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
