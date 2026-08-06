package com.tien.moderationservice.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Một lượt người dùng báo cáo nội dung hoặc tài khoản.
 * Nhiều Report trên cùng một đối tượng được gộp vào một ModerationCase (xem caseId).
 */
@Entity
@Table(
        name = "reports",
        indexes = {
            @Index(name = "idx_report_target", columnList = "target_type,target_id"),
            @Index(name = "idx_report_reporter", columnList = "reporter_id"),
            @Index(name = "idx_report_case", columnList = "case_id")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "reporter_id", nullable = false)
    String reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    TargetType targetType;

    @Column(name = "target_id", nullable = false)
    String targetId;

    // Chủ sở hữu nội dung bị báo cáo. Với TargetType.USER thì trùng targetId.
    @Column(name = "target_owner_id")
    String targetOwnerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false)
    ReportReason reason;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    ReportStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    CaseSeverity severity;

    @Column(name = "case_id")
    String caseId;

    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
