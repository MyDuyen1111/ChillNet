package com.tien.moderationservice.dto.response;

import java.time.LocalDateTime;

import com.tien.moderationservice.entity.AuditAction;
import com.tien.moderationservice.entity.TargetType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditLogResponse {
    String id;
    String actorId;
    AuditAction action;
    TargetType targetType;
    String targetId;
    String caseId;
    String detail;
    LocalDateTime createdAt;
}
