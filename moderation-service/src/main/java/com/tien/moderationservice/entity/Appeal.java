package com.tien.moderationservice.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Khiếu nại của người bị xử lý đối với một quyết định kiểm duyệt.
 * Mỗi hồ sơ chỉ nhận một khiếu nại (unique case_id) để tránh spam khiếu nại.
 */
@Entity
@Table(
        name = "appeals",
        uniqueConstraints = @UniqueConstraint(name = "uk_appeal_case", columnNames = "case_id"),
        indexes = @Index(name = "idx_appeal_appellant", columnList = "appellant_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Appeal {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "case_id", nullable = false)
    String caseId;

    @Column(name = "appellant_id", nullable = false)
    String appellantId;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    AppealStatus status;

    @Column(name = "reviewer_id")
    String reviewerId;

    @Column(name = "review_note", columnDefinition = "TEXT")
    String reviewNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @Column(name = "resolved_at")
    LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
