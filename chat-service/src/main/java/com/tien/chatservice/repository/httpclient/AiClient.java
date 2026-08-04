package com.tien.chatservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.chatservice.dto.ApiResponse;
import com.tien.chatservice.dto.request.AssistantReplyRequest;
import com.tien.chatservice.dto.response.AssistantReplyResponse;

/**
 * Gọi ai-service (Python/FastAPI) để lấy câu trả lời của trợ lý "ChillNet AI".
 *
 * <p>Trỏ tới endpoint internal (không cần JWT). Được gọi từ luồng STOMP/@Async —
 * nơi không có ServletRequestAttributes — nên interceptor forward JWT (null-safe)
 * chỉ bỏ qua header, không lỗi.
 */
@FeignClient(name = "ai-service", url = "${app.services.ai.url}")
public interface AiClient {

    @PostMapping("/internal/assistant/reply")
    ApiResponse<AssistantReplyResponse> reply(@RequestBody AssistantReplyRequest request);
}
