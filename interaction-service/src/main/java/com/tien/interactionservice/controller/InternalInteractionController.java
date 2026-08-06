package com.tien.interactionservice.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.tien.interactionservice.dto.ApiResponse;
import com.tien.interactionservice.dto.request.ContentModerationRequest;
import com.tien.interactionservice.dto.response.ModeratedContentResponse;
import com.tien.interactionservice.service.CommentService;
import com.tien.interactionservice.service.LikeService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/internal")
public class InternalInteractionController {
    CommentService commentService;
    LikeService likeService;

    @GetMapping("/likes/post/{postId}/count")
    ApiResponse<Long> getLikeCountByPost(@PathVariable String postId) {
        return ApiResponse.<Long>builder()
                .result(likeService.getLikeCountByPost(postId))
                .build();
    }

    @GetMapping("/likes/post/{postId}/is-liked")
    ApiResponse<Boolean> isPostLiked(@PathVariable String postId) {
        return ApiResponse.<Boolean>builder()
                .result(likeService.isPostLiked(postId))
                .build();
    }

    @GetMapping("/comments/post/{postId}/count")
    ApiResponse<Long> getCommentCountByPost(@PathVariable String postId) {
        return ApiResponse.<Long>builder()
                .result(commentService.getCommentCountByPost(postId))
                .build();
    }

    /**
     * Chủ bình luận. moderation-service gọi khi người dùng gửi báo cáo nên KHÔNG giới hạn ROLE_ADMIN.
     */
    @GetMapping("/comments/{commentId}/owner")
    ApiResponse<String> getCommentOwner(@PathVariable String commentId) {
        return ApiResponse.<String>builder()
                .result(commentService.getCommentOwner(commentId))
                .build();
    }

    /**
     * Hai endpoint kiểm duyệt dưới đây do moderation-service gọi khi kiểm duyệt viên làm việc.
     * /internal/** được permitAll nhưng JWT vẫn được decode nên @PreAuthorize vẫn có hiệu lực.
     */
    @GetMapping("/comments/{commentId}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<ModeratedContentResponse> getCommentForModeration(@PathVariable String commentId) {
        return ApiResponse.<ModeratedContentResponse>builder()
                .result(commentService.getCommentForModeration(commentId))
                .build();
    }

    @PostMapping("/comments/{commentId}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<Void> applyModeration(@PathVariable String commentId, @RequestBody ContentModerationRequest request) {
        commentService.applyModeration(commentId, request);
        return ApiResponse.<Void>builder()
                .message("Đã cập nhật trạng thái kiểm duyệt")
                .build();
    }
}
