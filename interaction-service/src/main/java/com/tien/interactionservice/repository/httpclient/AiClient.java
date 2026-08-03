package com.tien.interactionservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.interactionservice.configuration.FeignConfig;
import com.tien.interactionservice.dto.ApiResponse;
import com.tien.interactionservice.dto.request.ModerationRequest;
import com.tien.interactionservice.dto.response.ModerationResponse;

@FeignClient(name = "ai-service", url = "${app.services.ai.url}", configuration = FeignConfig.class)
public interface AiClient {
    @PostMapping("/internal/moderations/moderate")
    ApiResponse<ModerationResponse> moderate(@RequestBody ModerationRequest request);
}
