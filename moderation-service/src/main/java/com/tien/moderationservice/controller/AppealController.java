package com.tien.moderationservice.controller;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.tien.moderationservice.dto.ApiResponse;
import com.tien.moderationservice.dto.PageResponse;
import com.tien.moderationservice.dto.request.AppealReviewRequest;
import com.tien.moderationservice.dto.request.CreateAppealRequest;
import com.tien.moderationservice.dto.response.AppealResponse;
import com.tien.moderationservice.entity.AppealStatus;
import com.tien.moderationservice.service.AppealService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/appeals")
public class AppealController {
    AppealService appealService;

    // Người bị xử lý gửi khiếu nại cho một hồ sơ đã có quyết định.
    @PostMapping
    ApiResponse<AppealResponse> createAppeal(@RequestBody @Valid CreateAppealRequest request) {
        return ApiResponse.<AppealResponse>builder()
                .result(appealService.createAppeal(request))
                .build();
    }

    @GetMapping("/my")
    ApiResponse<PageResponse<AppealResponse>> getMyAppeals(
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<AppealResponse>>builder()
                .result(appealService.getMyAppeals(page, size))
                .build();
    }

    // Hàng đợi khiếu nại cho quản trị; mặc định là các khiếu nại đang chờ.
    @GetMapping
    ApiResponse<PageResponse<AppealResponse>> getAppeals(
            @RequestParam(value = "status", required = false) AppealStatus status,
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<AppealResponse>>builder()
                .result(appealService.getAppealsByStatus(status, page, size))
                .build();
    }

    @PostMapping("/{appealId}/review")
    ApiResponse<AppealResponse> reviewAppeal(
            @PathVariable String appealId, @RequestBody @Valid AppealReviewRequest request) {
        return ApiResponse.<AppealResponse>builder()
                .result(appealService.reviewAppeal(appealId, request))
                .build();
    }
}
