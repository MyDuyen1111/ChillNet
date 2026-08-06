package com.tien.postservice.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.tien.postservice.dto.ApiResponse;
import com.tien.postservice.dto.request.ContentModerationRequest;
import com.tien.postservice.dto.response.ModeratedContentResponse;
import com.tien.postservice.service.PostService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/internal")
public class InternalPostController {
    PostService postService;

    @GetMapping("/posts/{postId}/exists")
    ApiResponse<Boolean> checkPostExists(@PathVariable String postId) {
        boolean exists = postService.checkPostExists(postId);
        return ApiResponse.<Boolean>builder()
                .code(200)
                .message("Check post exists")
                .result(exists)
                .build();
    }

    /**
     * Chủ sở hữu bài viết. moderation-service gọi khi người dùng gửi báo cáo, để xác nhận
     * bài tồn tại và biết ai bị ảnh hưởng — nên KHÔNG giới hạn ROLE_ADMIN, chỉ trả về userId.
     */
    @GetMapping("/posts/{postId}/owner")
    ApiResponse<String> getPostOwner(@PathVariable String postId) {
        return ApiResponse.<String>builder()
                .result(postService.getPostOwner(postId))
                .build();
    }

    /**
     * Hai endpoint kiểm duyệt dưới đây do moderation-service gọi khi kiểm duyệt viên làm việc.
     * /internal/** được SecurityConfig permitAll nhưng JWT vẫn được decode, nên @PreAuthorize
     * vẫn có hiệu lực: moderation-service forward token của kiểm duyệt viên nên chỉ ROLE_ADMIN đi qua được.
     */
    @GetMapping("/posts/{postId}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<ModeratedContentResponse> getPostForModeration(@PathVariable String postId) {
        return ApiResponse.<ModeratedContentResponse>builder()
                .result(postService.getPostForModeration(postId))
                .build();
    }

    @PostMapping("/posts/{postId}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<Void> applyModeration(@PathVariable String postId, @RequestBody ContentModerationRequest request) {
        postService.applyModeration(postId, request);
        return ApiResponse.<Void>builder()
                .message("Đã cập nhật trạng thái kiểm duyệt")
                .build();
    }
}
