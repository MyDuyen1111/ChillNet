package com.tien.moderationservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.moderationservice.configuration.FeignConfig;
import com.tien.moderationservice.dto.ApiResponse;
import com.tien.moderationservice.dto.request.ContentModerationRequest;
import com.tien.moderationservice.dto.response.ReportedContentResponse;

@FeignClient(name = "interaction-service", url = "${app.services.interaction.url}", configuration = FeignConfig.class)
public interface InteractionClient {

    // Xác thực đối tượng khi người dùng thường gửi báo cáo — không yêu cầu ROLE_ADMIN bên interaction-service.
    @GetMapping("/internal/comments/{commentId}/owner")
    ApiResponse<String> getCommentOwner(@PathVariable String commentId);

    @GetMapping("/internal/comments/{commentId}/moderation")
    ApiResponse<ReportedContentResponse> getCommentForModeration(@PathVariable String commentId);

    @PostMapping("/internal/comments/{commentId}/moderation")
    ApiResponse<Void> applyModeration(@PathVariable String commentId, @RequestBody ContentModerationRequest request);
}
