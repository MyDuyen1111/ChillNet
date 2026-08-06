package com.tien.moderationservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
    UNAUTHORIZED(401, "Chưa xác thực", HttpStatus.UNAUTHORIZED),
    FORBIDDEN(403, "Không có quyền thực hiện thao tác này", HttpStatus.FORBIDDEN),
    INVALID_REQUEST(1002, "Dữ liệu gửi lên không hợp lệ", HttpStatus.BAD_REQUEST),
    // Báo cáo
    REPORT_NOT_FOUND(5001, "Không tìm thấy báo cáo", HttpStatus.NOT_FOUND),
    REPORT_ALREADY_SUBMITTED(5002, "Bạn đã báo cáo nội dung này rồi", HttpStatus.BAD_REQUEST),
    CANNOT_REPORT_SELF(5003, "Không thể tự báo cáo chính mình", HttpStatus.BAD_REQUEST),
    REPORT_TARGET_NOT_FOUND(5004, "Nội dung bị báo cáo không tồn tại", HttpStatus.NOT_FOUND),
    // Hồ sơ kiểm duyệt
    CASE_NOT_FOUND(6001, "Không tìm thấy hồ sơ kiểm duyệt", HttpStatus.NOT_FOUND),
    CASE_ALREADY_CLOSED(6002, "Hồ sơ kiểm duyệt đã được xử lý xong", HttpStatus.BAD_REQUEST),
    INVALID_ACTION_FOR_TARGET(6003, "Hành động không áp dụng được cho loại nội dung này", HttpStatus.BAD_REQUEST),
    ENFORCEMENT_FAILED(6004, "Không thực thi được quyết định lên dịch vụ liên quan", HttpStatus.BAD_GATEWAY),
    CASE_NOT_ACTIONED(6005, "Chỉ gỡ được biện pháp của hồ sơ đã bị xử lý", HttpStatus.BAD_REQUEST),
    // Khiếu nại
    APPEAL_NOT_FOUND(7001, "Không tìm thấy khiếu nại", HttpStatus.NOT_FOUND),
    APPEAL_ALREADY_EXISTS(7002, "Bạn đã gửi khiếu nại cho hồ sơ này", HttpStatus.BAD_REQUEST),
    APPEAL_NOT_ALLOWED(7003, "Chỉ có thể khiếu nại hồ sơ đã bị xử lý", HttpStatus.BAD_REQUEST),
    APPEAL_ALREADY_RESOLVED(7004, "Khiếu nại đã được xử lý", HttpStatus.BAD_REQUEST),
    NOT_CASE_SUBJECT(7005, "Bạn không phải người bị xử lý trong hồ sơ này", HttpStatus.FORBIDDEN),
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}
