package com.tien.moderationservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.moderationservice.configuration.FeignConfig;
import com.tien.moderationservice.dto.ApiResponse;
import com.tien.moderationservice.dto.request.AccountStatusRequest;
import com.tien.moderationservice.dto.response.UserAccountResponse;

@FeignClient(name = "identity-service", url = "${app.services.identity.url}", configuration = FeignConfig.class)
public interface IdentityClient {

    @GetMapping("/internal/users/{userId}")
    ApiResponse<UserAccountResponse> getUser(@PathVariable String userId);

    @PostMapping("/internal/users/{userId}/status")
    ApiResponse<Void> updateAccountStatus(@PathVariable String userId, @RequestBody AccountStatusRequest request);
}
