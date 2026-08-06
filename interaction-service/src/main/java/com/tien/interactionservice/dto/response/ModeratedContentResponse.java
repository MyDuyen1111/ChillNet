package com.tien.interactionservice.dto.response;

import java.util.List;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

// Ảnh chụp bình luận trả về cho moderation-service khi kiểm duyệt viên xem hồ sơ.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModeratedContentResponse {
    String id;
    String ownerId;
    String content;
    List<String> imageUrls;
    String moderationStatus;
    String createdAt;
}
