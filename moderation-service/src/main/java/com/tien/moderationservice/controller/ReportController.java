package com.tien.moderationservice.controller;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.tien.moderationservice.dto.ApiResponse;
import com.tien.moderationservice.dto.PageResponse;
import com.tien.moderationservice.dto.request.CreateReportRequest;
import com.tien.moderationservice.dto.response.ReportResponse;
import com.tien.moderationservice.service.ReportService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/reports")
public class ReportController {
    ReportService reportService;

    // Người dùng báo cáo một bài viết, bình luận, tài khoản hoặc nhóm.
    @PostMapping
    ApiResponse<ReportResponse> createReport(@RequestBody @Valid CreateReportRequest request) {
        return ApiResponse.<ReportResponse>builder()
                .result(reportService.createReport(request))
                .build();
    }

    // Người dùng theo dõi các báo cáo mình đã gửi và trạng thái xử lý của chúng.
    @GetMapping("/my")
    ApiResponse<PageResponse<ReportResponse>> getMyReports(
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<ReportResponse>>builder()
                .result(reportService.getMyReports(page, size))
                .build();
    }
}
