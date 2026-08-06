package com.tien.postservice.entity;

/**
 * Trạng thái kiểm duyệt của bài viết, do moderation-service đặt qua /internal/posts/{id}/moderation.
 * Bài cũ trong MongoDB không có trường này — null được coi là VISIBLE.
 */
public enum ModerationStatus {
    VISIBLE, // bình thường
    LIMITED, // giảm phân phối: còn trên trang cá nhân nhưng không lên feed/tìm kiếm
    HIDDEN, // ẩn với mọi người trừ chủ bài viết, có thể khôi phục
    REMOVED // đã gỡ; giữ lại bản ghi để đối chiếu khi khiếu nại
}
