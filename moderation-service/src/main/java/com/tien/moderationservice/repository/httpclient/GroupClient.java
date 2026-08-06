package com.tien.moderationservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.tien.moderationservice.configuration.FeignConfig;
import com.tien.moderationservice.dto.ApiResponse;
import com.tien.moderationservice.dto.response.GroupSummaryResponse;

@FeignClient(name = "group-service", url = "${app.services.group.url}", configuration = FeignConfig.class)
public interface GroupClient {

    @GetMapping("/internal/groups/{groupId}")
    ApiResponse<GroupSummaryResponse> getGroup(@PathVariable String groupId);
}
