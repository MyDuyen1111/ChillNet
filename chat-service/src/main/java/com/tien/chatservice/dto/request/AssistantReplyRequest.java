package com.tien.chatservice.dto.request;

import java.util.List;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/** Body gửi tới ai-service POST /internal/assistant/reply. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AssistantReplyRequest {
    /** Lịch sử của chính hội thoại với bot (role user/assistant). */
    List<AssistantMessage> messages;

    /**
     * Ngữ cảnh bổ sung: bản tóm lược các hội thoại KHÁC của người dùng (để trợ lý
     * tổng hợp/trả lời khi được hỏi về tin nhắn của họ). Có thể null/rỗng.
     */
    String context;
}
