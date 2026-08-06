package com.tien.moderationservice.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Nhật ký kiểm toán cho mọi thao tác kiểm duyệt.
 * Chỉ ghi thêm: không có @PreUpdate và không có API sửa/xóa, để nhật ký còn giá trị đối chiếu.
 */
@Entity
@Table(
        name = "audit_logs",
        indexes = {
            @Index(name = "idx_audit_case", columnList = "case_id"),
            @Index(name = "idx_audit_actor", columnList = "actor_id"),
            @Index(name = "idx_audit_created", columnList = "created_at")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    // Người thực hiện. "SYSTEM" khi hành động do hệ thống tự sinh.
    @Column(name = "actor_id", nullable = false, updatable = false)
    String actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, updatable = false)
    AuditAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", updatable = false)
    TargetType targetType;

    @Column(name = "target_id", updatable = false)
    String targetId;

    @Column(name = "case_id", updatable = false)
    String caseId;

    @Column(name = "detail", columnDefinition = "TEXT", updatable = false)
    String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
