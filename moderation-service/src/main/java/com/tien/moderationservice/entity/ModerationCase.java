package com.tien.moderationservice.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Hồ sơ kiểm duyệt: đơn vị công việc của kiểm duyệt viên.
 * Mỗi đối tượng (post/comment/user/group) chỉ có tối đa một hồ sơ đang mở tại một thời điểm;
 * các báo cáo mới trên cùng đối tượng làm tăng reportCount thay vì tạo hồ sơ mới.
 */
@Entity
@Table(
        name = "moderation_cases",
        indexes = {
            @Index(name = "idx_case_target", columnList = "target_type,target_id"),
            @Index(name = "idx_case_status", columnList = "status"),
            @Index(name = "idx_case_owner", columnList = "target_owner_id")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModerationCase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    TargetType targetType;

    @Column(name = "target_id", nullable = false)
    String targetId;

    @Column(name = "target_owner_id")
    String targetOwnerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    CaseStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    CaseSeverity severity;

    /**
     * Bản số của severity để ORDER BY. severity lưu dạng STRING nên sắp xếp trong SQL sẽ ra
     * thứ tự chữ cái (CRITICAL, HIGH, LOW, MEDIUM) chứ không phải thứ tự mức độ.
     * Được suy ra từ severity trong @PrePersist/@PreUpdate nên không cần set tay.
     */
    @Builder.Default
    @Column(name = "priority", nullable = false)
    int priority = 0;

    @Builder.Default
    @Column(name = "report_count", nullable = false)
    int reportCount = 0;

    // Kiểm duyệt viên đang xử lý hồ sơ.
    @Column(name = "assignee_id")
    String assigneeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action")
    ModerationAction action;

    @Column(name = "decision_note", columnDefinition = "TEXT")
    String decisionNote;

    @Column(name = "decided_by")
    String decidedBy;

    @Column(name = "decided_at")
    LocalDateTime decidedAt;

    // Thời điểm hết hạn khóa tài khoản, chỉ có giá trị với SUSPEND_ACCOUNT.
    @Column(name = "suspended_until")
    LocalDateTime suspendedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        syncPriority();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        syncPriority();
    }

    private void syncPriority() {
        priority = (severity != null) ? severity.ordinal() : 0;
    }
}
