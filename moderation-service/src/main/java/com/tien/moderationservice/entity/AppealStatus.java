package com.tien.moderationservice.entity;

// Kết quả khiếu nại: giữ nguyên hay đảo ngược quyết định ban đầu.
public enum AppealStatus {
    PENDING,
    UPHELD, // giữ nguyên quyết định
    OVERTURNED // đảo ngược, khôi phục nội dung/tài khoản
}
