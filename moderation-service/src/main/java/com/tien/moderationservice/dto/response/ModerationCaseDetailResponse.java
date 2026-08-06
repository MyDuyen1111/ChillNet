package com.tien.moderationservice.dto.response;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Toàn bộ ngữ cảnh một hồ sơ: quyết định, các báo cáo đã gộp, khiếu nại (nếu có)
 * và nhật ký kiểm toán — để kiểm duyệt viên xử lý mà không phải gọi thêm API.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModerationCaseDetailResponse {
    ModerationCaseResponse moderationCase;
    List<ReportResponse> reports;
    AppealResponse appeal;
    List<AuditLogResponse> auditLogs;
    // Ảnh chụp nội dung bị báo cáo lấy từ service gốc; null nếu nội dung đã bị xóa hẳn.
    ReportedContentResponse content;
}
