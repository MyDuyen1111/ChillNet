package com.tien.moderationservice.dto.response;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Hình dạng chung của nội dung bị báo cáo, do post-service/interaction-service trả về
 * qua endpoint /internal. Giữ tối thiểu các trường cần cho việc ra quyết định.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportedContentResponse {
    String id;
    String ownerId;
    String content;
    List<String> imageUrls;
    String moderationStatus;
    String createdAt;
}
