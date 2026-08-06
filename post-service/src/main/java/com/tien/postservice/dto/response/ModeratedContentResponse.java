package com.tien.postservice.dto.response;

import java.util.List;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

// Ảnh chụp bài viết trả về cho moderation-service khi kiểm duyệt viên xem hồ sơ.
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
