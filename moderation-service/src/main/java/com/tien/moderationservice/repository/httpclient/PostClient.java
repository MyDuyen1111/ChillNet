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

@FeignClient(name = "post-service", url = "${app.services.post.url}", configuration = FeignConfig.class)
public interface PostClient {

    // Xác thực đối tượng khi người dùng thường gửi báo cáo — không yêu cầu ROLE_ADMIN bên post-service.
    @GetMapping("/internal/posts/{postId}/owner")
    ApiResponse<String> getPostOwner(@PathVariable String postId);

    @GetMapping("/internal/posts/{postId}/moderation")
    ApiResponse<ReportedContentResponse> getPostForModeration(@PathVariable String postId);

    @PostMapping("/internal/posts/{postId}/moderation")
    ApiResponse<Void> applyModeration(@PathVariable String postId, @RequestBody ContentModerationRequest request);
}
