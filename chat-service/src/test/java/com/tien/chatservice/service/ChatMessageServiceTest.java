package com.tien.chatservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import com.tien.chatservice.constant.ParticipantRole;
import com.tien.chatservice.constant.TypeConversation;
import com.tien.chatservice.dto.ApiResponse;
import com.tien.chatservice.dto.request.ChatMessageRequest;
import com.tien.chatservice.dto.response.ChatMessageResponse;
import com.tien.chatservice.dto.response.ProfileResponse;
import com.tien.chatservice.entity.ChatMessage;
import com.tien.chatservice.entity.Conversation;
import com.tien.chatservice.entity.ParticipantInfo;
import com.tien.chatservice.mapper.ChatMessageMapper;
import com.tien.chatservice.repository.ChatMessageRepository;
import com.tien.chatservice.repository.ConversationRepository;
import com.tien.chatservice.repository.httpclient.ProfileClient;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    @Mock
    ChatMessageRepository chatMessageRepository;

    @Mock
    ChatMessageMapper chatMessageMapper;

    @Mock
    ProfileClient profileClient;

    @Mock
    ConversationRepository conversationRepository;

    @Mock
    SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    ChatMessageService chatMessageService;

    @BeforeEach
    void authenticateSender() {
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken("user-a", "n/a", List.of()));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createBroadcastsTheSavedMessageToEveryParticipant() {
        ChatMessageRequest request = ChatMessageRequest.builder()
                .conversationId("conversation-1")
                .message("Xin chao")
                .build();
        ParticipantInfo sender = participant("user-a");
        ParticipantInfo recipient = participant("user-b");
        Conversation conversation = Conversation.builder()
                .id("conversation-1")
                .typeConversation(TypeConversation.DIRECT)
                .participants(List.of(sender, recipient))
                .build();
        ProfileResponse profile = ProfileResponse.builder().userId("user-a").username("sender").build();
        ChatMessage message = ChatMessage.builder()
                .conversationId("conversation-1")
                .message("Xin chao")
                .build();
        ChatMessageResponse response = ChatMessageResponse.builder()
                .id("message-1")
                .conversationId("conversation-1")
                .message("Xin chao")
                .sender(sender)
                .build();

        when(conversationRepository.findById("conversation-1")).thenReturn(Optional.of(conversation));
        when(profileClient.getProfile("user-a"))
                .thenReturn(ApiResponse.<ProfileResponse>builder().result(profile).build());
        when(chatMessageMapper.toChatMessage(request)).thenReturn(message);
        when(chatMessageMapper.toChatMessageResponse(message)).thenReturn(response);

        ChatMessageResponse result = chatMessageService.create(request);

        assertThat(result.isMe()).isTrue();
        verify(chatMessageRepository).save(message);
        verify(messagingTemplate).convertAndSendToUser("user-a", "/queue/messages", response);
        verify(messagingTemplate).convertAndSendToUser("user-b", "/queue/messages", response);
    }

    private ParticipantInfo participant(String userId) {
        return ParticipantInfo.builder().userId(userId).role(ParticipantRole.ADMIN).build();
    }
}
