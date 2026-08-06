package com.tien.interactionservice.entity;

import java.time.Instant;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "comments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false)
    String postId;

    @Column(nullable = false)
    String userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    String content;

    @Column(name = "parent_comment_id")
    String parentCommentId; // For replies

    // Trạng thái kiểm duyệt do moderation-service đặt; null = VISIBLE (bình luận cũ)
    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status")
    ModerationStatus moderationStatus;

    @Column(name = "moderation_case_id")
    String moderationCaseId;

    @Column(nullable = false)
    Instant createdAt;

    @Column(nullable = false)
    Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
