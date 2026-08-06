package com.tien.moderationservice.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.tien.event.dto.NotificationEvent;
import com.tien.moderationservice.dto.response.UserAccountResponse;
import com.tien.moderationservice.entity.ModerationCase;
import com.tien.moderationservice.repository.httpclient.IdentityClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Soạn thông báo kết quả kiểm duyệt.
 *
 * Việc tra email chạy đồng bộ trong luồng request để Feign còn forward được JWT của kiểm duyệt viên
 * (identity-service không permitAll /internal/** như các service khác); chỉ khâu gửi mail được đẩy
 * sang {@link NotificationDispatcher}. Mọi lỗi đều bị nuốt — quyết định đã lưu không được phép
 * hỏng vì email.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ModerationNotificationService {

    IdentityClient identityClient;
    NotificationDispatcher notificationDispatcher;

    // Báo cho chủ nội dung biết nội dung của họ đã bị xử lý và họ có quyền khiếu nại.
    public void notifyDecision(ModerationCase moderationCase, String actionLabel) {
        String body =
                """
				<p>Chào bạn,</p>
				<p>Nội dung <b>%s</b> (ID: %s) của bạn đã được kiểm duyệt và bị áp dụng biện pháp: <b>%s</b>.</p>
				<p>Ghi chú của kiểm duyệt viên: %s</p>
				<p>Nếu bạn cho rằng đây là quyết định sai, bạn có thể gửi khiếu nại với mã hồ sơ
				<b>%s</b> trong mục Khiếu nại của ứng dụng.</p>
				"""
                        .formatted(
                                moderationCase.getTargetType(),
                                moderationCase.getTargetId(),
                                actionLabel,
                                moderationCase.getDecisionNote() != null
                                        ? moderationCase.getDecisionNote()
                                        : "(không có)",
                                moderationCase.getId());
        send(
                moderationCase.getTargetOwnerId(),
                "Nội dung của bạn đã bị xử lý",
                body,
                "MODERATION_DECISION",
                moderationCase.getId());
    }

    // Báo cho người đã gửi báo cáo biết báo cáo của họ đã được xử lý xong.
    public void notifyReporter(String reporterId, ModerationCase moderationCase, boolean violated) {
        String body =
                """
				<p>Chào bạn,</p>
				<p>Báo cáo của bạn về %s (ID: %s) đã được xem xét.</p>
				<p>Kết luận: <b>%s</b></p>
				<p>Cảm ơn bạn đã góp phần giữ ChillNet an toàn.</p>
				"""
                        .formatted(
                                moderationCase.getTargetType(),
                                moderationCase.getTargetId(),
                                violated ? "nội dung vi phạm và đã bị xử lý" : "nội dung không vi phạm chính sách");
        send(reporterId, "Kết quả xử lý báo cáo của bạn", body, "MODERATION_REPORT_RESULT", moderationCase.getId());
    }

    // Báo cho chủ nội dung khi quản trị tự gỡ biện pháp (không qua khiếu nại).
    public void notifyReverted(ModerationCase moderationCase, String reason) {
        String body =
                """
				<p>Chào bạn,</p>
				<p>Biện pháp áp dụng lên %s (ID: %s) của bạn đã được gỡ bỏ sau khi xem xét lại.</p>
				<p>Lý do: %s</p>
				<p>Nội dung hoặc tài khoản của bạn đã được khôi phục.</p>
				"""
                        .formatted(
                                moderationCase.getTargetType(),
                                moderationCase.getTargetId(),
                                reason != null ? reason : "(không có)");
        send(
                moderationCase.getTargetOwnerId(),
                "Biện pháp kiểm duyệt đã được gỡ bỏ",
                body,
                "MODERATION_REVERTED",
                moderationCase.getId());
    }

    // Báo kết quả xét khiếu nại cho người khiếu nại.
    public void notifyAppealResult(String appellantId, ModerationCase moderationCase, boolean overturned, String note) {
        String body =
                """
				<p>Chào bạn,</p>
				<p>Khiếu nại của bạn cho hồ sơ <b>%s</b> đã được xem xét lại.</p>
				<p>Kết quả: <b>%s</b></p>
				<p>Ghi chú: %s</p>
				"""
                        .formatted(
                                moderationCase.getId(),
                                overturned
                                        ? "quyết định đã được đảo ngược, nội dung/tài khoản được khôi phục"
                                        : "giữ nguyên quyết định ban đầu",
                                note != null ? note : "(không có)");
        send(appellantId, "Kết quả khiếu nại kiểm duyệt", body, "MODERATION_APPEAL_RESULT", moderationCase.getId());
    }

    private void send(String userId, String subject, String body, String type, String caseId) {
        if (userId == null || userId.isBlank()) return;
        try {
            UserAccountResponse account = fetchAccount(userId);
            if (account == null
                    || account.getEmail() == null
                    || account.getEmail().isBlank()) {
                log.warn("Bỏ qua thông báo kiểm duyệt: không lấy được email của user {}", userId);
                return;
            }

            Map<String, Object> param = new HashMap<>();
            param.put("userId", userId);
            param.put("type", type);
            param.put("relatedEntityId", caseId);
            param.put("relatedEntityType", "MODERATION_CASE");

            notificationDispatcher.dispatch(NotificationEvent.builder()
                    .channel("EMAIL")
                    .recipient(account.getEmail())
                    .subject(subject)
                    .body(body)
                    .param(param)
                    .build());
        } catch (Exception e) {
            log.error("Không soạn được thông báo kiểm duyệt cho user {}: {}", userId, e.getMessage());
        }
    }

    private UserAccountResponse fetchAccount(String userId) {
        try {
            var response = identityClient.getUser(userId);
            return response != null ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("Không lấy được tài khoản {} từ identity-service: {}", userId, e.getMessage());
            return null;
        }
    }
}
