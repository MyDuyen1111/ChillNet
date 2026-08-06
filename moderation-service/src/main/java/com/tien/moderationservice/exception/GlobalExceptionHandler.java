package com.tien.moderationservice.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.tien.moderationservice.dto.ApiResponse;

import lombok.extern.slf4j.Slf4j;

// GlobalExceptionHandler: Chịu trách nhiệm xử lý tập trung tất cả exception trong hệ thống.
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Handler cho AppException (custom business exception).
    @ExceptionHandler(AppException.class)
    ResponseEntity<ApiResponse<?>> handleAppException(AppException e) {
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity.status(errorCode.getStatusCode())
                .body(ApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    // Handler cho AccessDeniedException: @PreAuthorize("hasRole('ADMIN')") chặn thì trả 403,
    // nếu không sẽ rơi vào handler Exception bên dưới và biến thành 500.
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResponse<?>> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(ErrorCode.FORBIDDEN.getStatusCode())
                .body(ApiResponse.builder()
                        .code(ErrorCode.FORBIDDEN.getCode())
                        .message(ErrorCode.FORBIDDEN.getMessage())
                        .build());
    }

    // Handler cho lỗi validate @Valid: trả về thông điệp của field đầu tiên bị sai.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldError() != null
                ? e.getBindingResult().getFieldError().getDefaultMessage()
                : ErrorCode.INVALID_REQUEST.getMessage();
        return ResponseEntity.status(ErrorCode.INVALID_REQUEST.getStatusCode())
                .body(ApiResponse.builder()
                        .code(ErrorCode.INVALID_REQUEST.getCode())
                        .message(message)
                        .build());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<?>> handleException(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatusCode())
                .body(ApiResponse.builder()
                        .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                        .message(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage())
                        .build());
    }
}
