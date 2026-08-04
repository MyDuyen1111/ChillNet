package com.tien.chatservice.service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.tien.chatservice.constant.AiAssistant;
import com.tien.chatservice.constant.TypeConversation;
import com.tien.chatservice.dto.ApiResponse;
import com.tien.chatservice.dto.request.AssistantMessage;
import com.tien.chatservice.dto.request.AssistantReplyRequest;
import com.tien.chatservice.dto.response.AssistantReplyResponse;
import com.tien.chatservice.dto.response.ChatMessageResponse;
import com.tien.chatservice.entity.ChatMessage;
import com.tien.chatservice.entity.Conversation;
import com.tien.chatservice.entity.ParticipantInfo;
import com.tien.chatservice.repository.ChatMessageRepository;
import com.tien.chatservice.repository.ConversationRepository;
import com.tien.chatservice.repository.httpclient.AiClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Sinh câu trả lời của trợ lý "ChillNet AI" khi người dùng nhắn vào hội thoại AI.
 *
 * <p>Chạy bất đồng bộ để KHÔNG chặn luồng xử lý STOMP: tin của người dùng đã được
 * lưu + broadcast trước; ở đây gom lịch sử gần nhất, gọi ai-service, rồi lưu và
 * broadcast tin của bot lên cùng {@code /topic/conversation/{id}} như tin người thật.
 *
 * <p>Fail-quiet: nếu ai-service lỗi/thiếu key thì không phát tin bot, chat vẫn chạy.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AiAssistantService {

    static int HISTORY_LIMIT = 12; // số tin gần nhất của chính hội thoại bot đưa vào ngữ cảnh

    // Giới hạn bản tóm lược các hội thoại KHÁC của user (để trợ lý tổng hợp khi được hỏi).
    static int DIGEST_MAX_CONVERSATIONS = 12;
    static int DIGEST_MESSAGES_PER_CONV = 15;
    static int DIGEST_CHAR_BUDGET = 6000;
    static int DIGEST_MSG_MAX_LEN = 240;

    ChatMessageRepository chatMessageRepository;
    ConversationRepository conversationRepository;
    SimpMessagingTemplate messagingTemplate;
    AiClient aiClient;

    /** Hội thoại có phải là hội thoại với trợ lý AI không (một participant là bot). */
    public boolean isAiConversation(Conversation conversation) {
        return conversation != null
                && conversation.getParticipants() != null
                && conversation.getParticipants().stream().anyMatch(p -> AiAssistant.USER_ID.equals(p.getUserId()));
    }

    @Async
    public void replyAsync(String conversationId) {
        try {
            List<AssistantMessage> history = buildContext(conversationId);
            if (history.isEmpty()) return;

            // Cho trợ lý "đọc" các hội thoại KHÁC của user để tổng hợp/trả lời khi được hỏi.
            String userId = resolveHumanUserId(conversationId);
            String digest = (userId != null) ? buildUserConversationsDigest(userId, conversationId) : "";

            String reply = callAi(history, digest);
            if (reply == null || reply.isBlank()) return;

            ChatMessage botMessage = ChatMessage.builder()
                    .conversationId(conversationId)
                    .message(reply)
                    .sender(AiAssistant.participant())
                    .createdDate(Instant.now())
                    .build();
            chatMessageRepository.save(botMessage);

            ChatMessageResponse response = ChatMessageResponse.builder()
                    .id(botMessage.getId())
                    .conversationId(conversationId)
                    .me(false)
                    .message(botMessage.getMessage())
                    .sender(botMessage.getSender())
                    .createdDate(botMessage.getCreatedDate())
                    .build();

            messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, response);
        } catch (Exception e) {
            log.error("Sinh câu trả lời AI thất bại cho conversation {}: {}", conversationId, e.getMessage());
        }
    }

    /** Lấy HISTORY_LIMIT tin gần nhất, đảo về thứ tự tăng dần, gán role user/assistant. */
    private List<AssistantMessage> buildContext(String conversationId) {
        return chatMessageRepository.findAllByConversationIdOrderByCreatedDateDesc(conversationId).stream()
                .limit(HISTORY_LIMIT)
                .sorted(Comparator.comparing(ChatMessage::getCreatedDate))
                .map(m -> AssistantMessage.builder()
                        .role(isBot(m) ? "assistant" : "user")
                        .content(m.getMessage())
                        .build())
                .toList();
    }

    private boolean isBot(ChatMessage message) {
        return message.getSender() != null
                && AiAssistant.USER_ID.equals(message.getSender().getUserId());
    }

    /** userId của người (không phải bot) trong hội thoại với trợ lý. */
    private String resolveHumanUserId(String conversationId) {
        return conversationRepository
                .findById(conversationId)
                .flatMap(c -> c.getParticipants().stream()
                        .map(ParticipantInfo::getUserId)
                        .filter(id -> !AiAssistant.USER_ID.equals(id))
                        .findFirst())
                .orElse(null);
    }

    /**
     * Bản tóm lược các hội thoại KHÁC của user (bỏ qua hội thoại với bot). Chỉ đọc dữ liệu
     * mà user vốn được xem (họ là participant) — không rò rỉ ngoài phạm vi của họ.
     */
    private String buildUserConversationsDigest(String userId, String excludeConversationId) {
        List<Conversation> conversations = conversationRepository.findAllByParticipantIdsContains(userId).stream()
                .filter(c -> !c.getId().equals(excludeConversationId))
                .sorted(Comparator.comparing(
                                (Conversation c) ->
                                        c.getModifiedDate() != null ? c.getModifiedDate() : c.getCreatedDate(),
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed())
                .limit(DIGEST_MAX_CONVERSATIONS)
                .toList();

        StringBuilder sb = new StringBuilder();
        for (Conversation c : conversations) {
            List<ChatMessage> recent =
                    chatMessageRepository.findAllByConversationIdOrderByCreatedDateDesc(c.getId()).stream()
                            .limit(DIGEST_MESSAGES_PER_CONV)
                            .sorted(Comparator.comparing(ChatMessage::getCreatedDate))
                            .toList();
            if (recent.isEmpty()) continue;

            sb.append("\n[").append(conversationLabel(c, userId)).append("]\n");
            for (ChatMessage m : recent) {
                sb.append(senderLabel(m, userId))
                        .append(": ")
                        .append(truncate(m.getMessage(), DIGEST_MSG_MAX_LEN))
                        .append("\n");
            }
            if (sb.length() >= DIGEST_CHAR_BUDGET) {
                sb.append("... (còn nữa)\n");
                break;
            }
        }
        return sb.toString().trim();
    }

    private String conversationLabel(Conversation c, String userId) {
        if (c.getTypeConversation() == TypeConversation.GROUP) {
            String name = c.getConversationName();
            return "Nhóm: " + (name != null && !name.isBlank() ? name : "Không tên");
        }
        String other = c.getParticipants().stream()
                .filter(p -> !userId.equals(p.getUserId()))
                .findFirst()
                .map(this::displayName)
                .orElse("Người dùng");
        return "Trò chuyện với " + other;
    }

    private String senderLabel(ChatMessage m, String userId) {
        ParticipantInfo s = m.getSender();
        if (s == null) return "Người dùng";
        if (userId.equals(s.getUserId())) return "Bạn";
        if (AiAssistant.USER_ID.equals(s.getUserId())) return "ChillNet AI";
        return displayName(s);
    }

    private String displayName(ParticipantInfo p) {
        String first = p.getFirstName() != null ? p.getFirstName() : "";
        String last = p.getLastName() != null ? p.getLastName() : "";
        String full = (first + " " + last).trim();
        if (!full.isEmpty()) return full;
        return p.getUsername() != null ? p.getUsername() : "Người dùng";
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private String callAi(List<AssistantMessage> history, String digest) {
        try {
            ApiResponse<AssistantReplyResponse> res = aiClient.reply(AssistantReplyRequest.builder()
                    .messages(history)
                    .context((digest == null || digest.isBlank()) ? null : digest)
                    .build());
            if (res == null || res.getResult() == null) return null;
            return res.getResult().getReply();
        } catch (Exception e) {
            log.warn("Gọi ai-service (assistant) thất bại — bỏ qua tin bot: {}", e.getMessage());
            return null;
        }
    }
}
