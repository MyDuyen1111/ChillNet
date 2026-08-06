package com.tien.moderationservice.entity;

// Vòng đời của một báo cáo do người dùng gửi lên.
public enum ReportStatus {
    PENDING, // chờ phân loại
    UNDER_REVIEW, // hồ sơ đang được kiểm duyệt viên xử lý
    RESOLVED, // đã xử lý và có biện pháp
    REJECTED // đã xem xét nhưng không vi phạm
}
