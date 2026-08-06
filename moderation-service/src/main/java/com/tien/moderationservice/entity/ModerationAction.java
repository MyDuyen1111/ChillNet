package com.tien.moderationservice.entity;

// Biện pháp xử lý. NONE dùng khi kết luận không vi phạm.
// Các biện pháp có tác động lên dịch vụ khác được EnforcementService thực thi qua Feign.
public enum ModerationAction {
    NONE, // không vi phạm
    WARN, // chỉ cảnh báo chủ nội dung
    LIMIT_DISTRIBUTION, // giảm phân phối: nội dung còn nhưng không lên feed/tìm kiếm
    HIDE_CONTENT, // ẩn nội dung, có thể khôi phục
    REMOVE_CONTENT, // gỡ nội dung
    SUSPEND_ACCOUNT, // khóa tài khoản có thời hạn
    BAN_ACCOUNT // khóa vĩnh viễn
}
