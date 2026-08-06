package com.tien.moderationservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.event.dto.NotificationEvent;

/**
 * Endpoint /internal/** được notification-service permit sẵn nên không cần forward JWT
 * (cố tình không dùng FeignConfig: thông báo được gửi từ luồng @Async, không có request context).
 */
@FeignClient(name = "notification-service", url = "${app.services.notification.url}")
public interface NotificationClient {

    @PostMapping(value = "/internal/notifications/send", produces = MediaType.APPLICATION_JSON_VALUE)
    void sendNotification(@RequestBody NotificationEvent event);
}
