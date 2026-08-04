package com.tien.chatservice.constant;

import com.tien.chatservice.entity.ParticipantInfo;

/**
 * Danh tính cố định của trợ lý ảo "ChillNet AI".
 *
 * <p>Bot không tồn tại trong profile-service. Một hội thoại với AI chỉ là một
 * conversation DIRECT bình thường mà một trong hai participant có {@link #USER_ID}.
 * Nhận diện hội thoại AI bằng {@code participants.stream().anyMatch(userId == AI)}.
 */
public final class AiAssistant {

    private AiAssistant() {}

    public static final String USER_ID = "ai-assistant";
    public static final String USERNAME = "chillnet_ai";
    public static final String FIRST_NAME = "ChillNet";
    public static final String LAST_NAME = "AI";
    public static final String AVATAR = ""; // frontend vẽ avatar gradient riêng cho bot

    public static final String GREETING = "Chào bạn 👋 Mình là ChillNet AI. Bạn cần mình giúp gì hôm nay?";

    /** Dựng snapshot ParticipantInfo của bot (dùng làm participant + sender của tin bot). */
    public static ParticipantInfo participant() {
        return ParticipantInfo.builder()
                .userId(USER_ID)
                .username(USERNAME)
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .avatar(AVATAR)
                .role(ParticipantRole.MEMBER)
                .build();
    }
}
