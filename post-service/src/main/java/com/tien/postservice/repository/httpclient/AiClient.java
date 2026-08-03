package com.tien.postservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.postservice.configuration.FeignConfig;
import com.tien.postservice.dto.ApiResponse;
import com.tien.postservice.dto.request.ModerationRequest;
import com.tien.postservice.dto.response.ModerationResponse;

@FeignClient(name = "ai-service", url = "${app.services.ai.url}", configuration = FeignConfig.class)
public interface AiClient {
    @PostMapping("/internal/moderations/moderate")
    ApiResponse<ModerationResponse> moderate(@RequestBody ModerationRequest request);
}
