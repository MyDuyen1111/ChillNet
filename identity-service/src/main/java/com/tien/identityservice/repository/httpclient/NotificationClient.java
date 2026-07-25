package com.tien.identityservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.event.dto.NotificationEvent;

/**
 * Client gọi endpoint nội bộ của notification-service (thay cho Kafka topic "notification-delivery").
 * Endpoint /internal/** được notification-service permit sẵn nên không cần forward JWT.
 */
@FeignClient(name = "notification-service", url = "${app.services.notification.url}")
public interface NotificationClient {
    @PostMapping(value = "/internal/notifications/send", produces = MediaType.APPLICATION_JSON_VALUE)
    void sendNotification(@RequestBody NotificationEvent event);
}
