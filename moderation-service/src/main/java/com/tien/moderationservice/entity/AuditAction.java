package com.tien.moderationservice.entity;

// Các sự kiện được ghi vào nhật ký kiểm toán. Nhật ký chỉ ghi thêm, không sửa/xóa.
public enum AuditAction {
    REPORT_CREATED,
    CASE_OPENED,
    CASE_ASSIGNED,
    CASE_DECIDED,
    ENFORCEMENT_APPLIED,
    ENFORCEMENT_FAILED,
    APPEAL_CREATED,
    APPEAL_REVIEWED,
    ENFORCEMENT_REVERTED
}
