package com.tien.moderationservice.entity;

// Vòng đời của hồ sơ kiểm duyệt. Nhiều báo cáo trên cùng một đối tượng gộp vào một hồ sơ.
public enum CaseStatus {
    OPEN, // mới mở, chưa ai nhận
    IN_REVIEW, // đã có kiểm duyệt viên nhận xử lý
    ACTIONED, // đã ra quyết định và áp dụng biện pháp
    DISMISSED, // đã xem xét, kết luận không vi phạm
    APPEALED, // người bị xử lý đã gửi khiếu nại
    REVERSED // quyết định bị đảo ngược sau khiếu nại
}
