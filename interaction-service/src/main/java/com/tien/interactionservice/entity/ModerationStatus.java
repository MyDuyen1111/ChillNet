package com.tien.interactionservice.entity;

/**
 * Trạng thái kiểm duyệt của bình luận, do moderation-service đặt qua
 * /internal/comments/{id}/moderation. Bình luận cũ không có giá trị — null được coi là VISIBLE.
 */
public enum ModerationStatus {
    VISIBLE,
    LIMITED,
    HIDDEN,
    REMOVED
}
