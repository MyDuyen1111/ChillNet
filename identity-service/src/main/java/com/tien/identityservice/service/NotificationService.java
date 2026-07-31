package com.tien.identityservice.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.tien.event.dto.NotificationEvent;
import com.tien.identityservice.repository.httpclient.NotificationClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * NotificationService: Service gửi thông báo sang notification-service qua Feign (endpoint nội bộ).
 * - Gọi @Async + nuốt lỗi (fire-and-forget) để flow nghiệp vụ (đăng ký, OTP...)
 *   không bị chậm hoặc thất bại chỉ vì việc gửi email
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {
    NotificationClient notificationClient;

    // Gửi event thông báo sang notification-service
    @Async
    public void sendNotification(NotificationEvent event) {
        deliver(event);
    }

    // Tạo và gửi email notification event
    @Async
    public void sendEmail(String recipient, String subject, String body) {
        NotificationEvent event = NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(recipient)
                .subject(subject)
                .body(body)
                .build();
        deliver(event);
    }

    private void deliver(NotificationEvent event) {
        try {
            notificationClient.sendNotification(event);
        } catch (Exception e) {
            log.error("Không gửi được notification sang notification-service: {}", e.getMessage());
        }
    }
}
