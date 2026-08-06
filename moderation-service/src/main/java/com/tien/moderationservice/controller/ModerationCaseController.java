package com.tien.moderationservice.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.tien.moderationservice.dto.ApiResponse;
import com.tien.moderationservice.dto.PageResponse;
import com.tien.moderationservice.dto.request.CaseDecisionRequest;
import com.tien.moderationservice.dto.request.CaseRevertRequest;
import com.tien.moderationservice.dto.response.AuditLogResponse;
import com.tien.moderationservice.dto.response.ModerationCaseDetailResponse;
import com.tien.moderationservice.dto.response.ModerationCaseResponse;
import com.tien.moderationservice.dto.response.ModerationStatsResponse;
import com.tien.moderationservice.entity.CaseStatus;
import com.tien.moderationservice.entity.TargetType;
import com.tien.moderationservice.service.ModerationCaseService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/cases")
public class ModerationCaseController {
    ModerationCaseService moderationCaseService;

    // Hàng đợi kiểm duyệt, sắp theo mức nghiêm trọng rồi tới thời gian mở hồ sơ.
    @GetMapping
    ApiResponse<PageResponse<ModerationCaseResponse>> getQueue(
            @RequestParam(value = "status", required = false) CaseStatus status,
            @RequestParam(value = "targetType", required = false) TargetType targetType,
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<ModerationCaseResponse>>builder()
                .result(moderationCaseService.getQueue(status, targetType, page, size))
                .build();
    }

    @GetMapping("/stats")
    ApiResponse<ModerationStatsResponse> getStats() {
        return ApiResponse.<ModerationStatsResponse>builder()
                .result(moderationCaseService.getStats())
                .build();
    }

    // Người dùng xem những quyết định đã áp dụng lên nội dung/tài khoản của mình.
    @GetMapping("/against-me")
    ApiResponse<PageResponse<ModerationCaseResponse>> getCasesAgainstMe(
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<ModerationCaseResponse>>builder()
                .result(moderationCaseService.getCasesAgainstMe(page, size))
                .build();
    }

    @GetMapping("/{caseId}")
    ApiResponse<ModerationCaseDetailResponse> getCaseDetail(@PathVariable String caseId) {
        return ApiResponse.<ModerationCaseDetailResponse>builder()
                .result(moderationCaseService.getCaseDetail(caseId))
                .build();
    }

    @GetMapping("/{caseId}/audit")
    ApiResponse<List<AuditLogResponse>> getCaseAuditLogs(@PathVariable String caseId) {
        return ApiResponse.<List<AuditLogResponse>>builder()
                .result(moderationCaseService.getCaseAuditLogs(caseId))
                .build();
    }

    @PostMapping("/{caseId}/assign")
    ApiResponse<ModerationCaseResponse> assignToMe(@PathVariable String caseId) {
        return ApiResponse.<ModerationCaseResponse>builder()
                .result(moderationCaseService.assignToMe(caseId))
                .build();
    }

    @PostMapping("/{caseId}/decision")
    ApiResponse<ModerationCaseResponse> decide(
            @PathVariable String caseId, @RequestBody @Valid CaseDecisionRequest request) {
        return ApiResponse.<ModerationCaseResponse>builder()
                .result(moderationCaseService.decide(caseId, request))
                .build();
    }

    // Gỡ biện pháp đã áp dụng mà không cần khiếu nại — đường duy nhất để sửa một lệnh khóa
    // tài khoản nhầm, vì người bị khóa không gọi được API nào để tự khiếu nại.
    @PostMapping("/{caseId}/revert")
    ApiResponse<ModerationCaseResponse> revertDecision(
            @PathVariable String caseId, @RequestBody @Valid CaseRevertRequest request) {
        return ApiResponse.<ModerationCaseResponse>builder()
                .result(moderationCaseService.revertDecision(caseId, request))
                .build();
    }
}
