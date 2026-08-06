package com.tien.moderationservice.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.tien.event.dto.NotificationEvent;
import com.tien.moderationservice.repository.httpclient.NotificationClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Đẩy việc gửi email ra khỏi luồng request. Tách thành bean riêng vì @Async chỉ có tác dụng
 * khi được gọi qua proxy Spring (gọi method private trong cùng bean sẽ chạy đồng bộ).
 *
 * Endpoint /internal của notification-service là permitAll nên không cần JWT ở luồng này.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationDispatcher {

    NotificationClient notificationClient;

    @Async
    public void dispatch(NotificationEvent event) {
        try {
            notificationClient.sendNotification(event);
        } catch (Exception e) {
            // Nuốt lỗi: hộp thư hỏng không được phép làm hỏng quyết định kiểm duyệt đã lưu.
            log.error("Không gửi được thông báo kiểm duyệt tới {}: {}", event.getRecipient(), e.getMessage());
        }
    }
}
