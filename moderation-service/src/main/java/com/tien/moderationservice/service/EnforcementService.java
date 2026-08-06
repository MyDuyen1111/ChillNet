package com.tien.moderationservice.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.tien.moderationservice.dto.request.AccountStatusRequest;
import com.tien.moderationservice.dto.request.ContentModerationRequest;
import com.tien.moderationservice.dto.response.ReportedContentResponse;
import com.tien.moderationservice.entity.ModerationAction;
import com.tien.moderationservice.entity.ModerationCase;
import com.tien.moderationservice.entity.TargetType;
import com.tien.moderationservice.exception.AppException;
import com.tien.moderationservice.exception.ErrorCode;
import com.tien.moderationservice.repository.httpclient.GroupClient;
import com.tien.moderationservice.repository.httpclient.IdentityClient;
import com.tien.moderationservice.repository.httpclient.InteractionClient;
import com.tien.moderationservice.repository.httpclient.PostClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Thực thi quyết định kiểm duyệt lên các service sở hữu dữ liệu.
 * Đây là nơi duy nhất trong moderation-service gọi ra ngoài để thay đổi trạng thái nội dung/tài khoản.
 *
 * Khác với các luồng fail-open của repo (AI moderation, email): thất bại ở đây được ném ra ngoài
 * (ENFORCEMENT_FAILED) — một quyết định gỡ bài mà thực tế bài vẫn hiển thị thì tệ hơn là báo lỗi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EnforcementService {

    static final String STATUS_VISIBLE = "VISIBLE";
    static final String STATUS_LIMITED = "LIMITED";
    static final String STATUS_HIDDEN = "HIDDEN";
    static final String STATUS_REMOVED = "REMOVED";

    PostClient postClient;
    InteractionClient interactionClient;
    IdentityClient identityClient;
    GroupClient groupClient;

    // Xác định chủ sở hữu của đối tượng bị báo cáo; ném REPORT_TARGET_NOT_FOUND nếu không tồn tại.
    // Được gọi trong luồng của người dùng thường nên chỉ dùng các endpoint không đòi ROLE_ADMIN.
    public String resolveTargetOwner(TargetType targetType, String targetId) {
        return switch (targetType) {
            case USER -> requireOwner(fetchUserId(targetId), targetType, targetId);
            case POST -> requireOwner(fetchPostOwner(targetId), targetType, targetId);
            case COMMENT -> requireOwner(fetchCommentOwner(targetId), targetType, targetId);
            case GROUP -> requireOwner(fetchGroupOwner(targetId), targetType, targetId);
        };
    }

    // Ảnh chụp nội dung để kiểm duyệt viên xem khi ra quyết định. Trả null nếu không lấy được.
    public ReportedContentResponse fetchContentSnapshot(TargetType targetType, String targetId) {
        try {
            return switch (targetType) {
                case POST -> fetchPost(targetId);
                case COMMENT -> fetchComment(targetId);
                case USER, GROUP -> null;
            };
        } catch (Exception e) {
            log.warn("Không lấy được nội dung {} {}: {}", targetType, targetId, e.getMessage());
            return null;
        }
    }

    // Kiểm tra biện pháp có áp dụng được cho loại đối tượng này không.
    public void validateAction(ModerationCase moderationCase, ModerationAction action) {
        boolean contentAction = action == ModerationAction.HIDE_CONTENT
                || action == ModerationAction.REMOVE_CONTENT
                || action == ModerationAction.LIMIT_DISTRIBUTION;
        boolean accountAction = action == ModerationAction.SUSPEND_ACCOUNT || action == ModerationAction.BAN_ACCOUNT;

        if (contentAction
                && moderationCase.getTargetType() != TargetType.POST
                && moderationCase.getTargetType() != TargetType.COMMENT) {
            throw new AppException(ErrorCode.INVALID_ACTION_FOR_TARGET);
        }
        if (accountAction
                && (moderationCase.getTargetOwnerId() == null
                        || moderationCase.getTargetOwnerId().isBlank())) {
            throw new AppException(ErrorCode.INVALID_ACTION_FOR_TARGET);
        }
    }

    /**
     * Áp dụng biện pháp. NONE/WARN không gọi ra ngoài (chỉ ghi hồ sơ + gửi thông báo).
     * suspendedUntil chỉ dùng cho SUSPEND_ACCOUNT.
     *
     * action và reason được truyền vào thay vì đọc từ moderationCase, để phía gọi không phải
     * sửa thực thể trước khi biết việc thực thi có thành công hay không — open-in-view đang bật
     * nên một save() bất kỳ sau đó sẽ flush luôn cả các thay đổi chưa muốn lưu.
     */
    public void apply(
            ModerationCase moderationCase, ModerationAction action, LocalDateTime suspendedUntil, String reason) {
        switch (action) {
            case NONE, WARN -> log.info(
                    "Hồ sơ {}: biện pháp {} không cần thực thi ra ngoài", moderationCase.getId(), action);
            case LIMIT_DISTRIBUTION -> applyContentStatus(moderationCase, STATUS_LIMITED, reason);
            case HIDE_CONTENT -> applyContentStatus(moderationCase, STATUS_HIDDEN, reason);
            case REMOVE_CONTENT -> applyContentStatus(moderationCase, STATUS_REMOVED, reason);
            case SUSPEND_ACCOUNT -> applyAccountStatus(moderationCase, "SUSPENDED", suspendedUntil, reason);
            case BAN_ACCOUNT -> applyAccountStatus(moderationCase, "BANNED", null, reason);
        }
    }

    // Khôi phục hiện trạng khi khiếu nại được chấp nhận.
    public void revert(ModerationCase moderationCase, String reason) {
        ModerationAction action = moderationCase.getAction();
        if (action == null) return;

        switch (action) {
            case NONE, WARN -> log.info(
                    "Hồ sơ {}: biện pháp {} không có gì để khôi phục", moderationCase.getId(), action);
            case LIMIT_DISTRIBUTION, HIDE_CONTENT, REMOVE_CONTENT -> applyContentStatus(
                    moderationCase, STATUS_VISIBLE, reason);
            case SUSPEND_ACCOUNT, BAN_ACCOUNT -> applyAccountStatus(moderationCase, "ACTIVE", null, reason);
        }
    }

    private void applyContentStatus(ModerationCase moderationCase, String status, String reason) {
        ContentModerationRequest request = ContentModerationRequest.builder()
                .status(status)
                .caseId(moderationCase.getId())
                .reason(reason)
                .build();
        try {
            if (moderationCase.getTargetType() == TargetType.POST) {
                postClient.applyModeration(moderationCase.getTargetId(), request);
            } else if (moderationCase.getTargetType() == TargetType.COMMENT) {
                interactionClient.applyModeration(moderationCase.getTargetId(), request);
            } else {
                throw new AppException(ErrorCode.INVALID_ACTION_FOR_TARGET);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error(
                    "Không đổi được trạng thái nội dung {} {} sang {}: {}",
                    moderationCase.getTargetType(),
                    moderationCase.getTargetId(),
                    status,
                    e.getMessage());
            throw new AppException(ErrorCode.ENFORCEMENT_FAILED);
        }
    }

    private void applyAccountStatus(
            ModerationCase moderationCase, String status, LocalDateTime suspendedUntil, String reason) {
        AccountStatusRequest request = AccountStatusRequest.builder()
                .status(status)
                .suspendedUntil(suspendedUntil)
                .caseId(moderationCase.getId())
                .reason(reason)
                .build();
        try {
            identityClient.updateAccountStatus(moderationCase.getTargetOwnerId(), request);
        } catch (Exception e) {
            log.error(
                    "Không đổi được trạng thái tài khoản {} sang {}: {}",
                    moderationCase.getTargetOwnerId(),
                    status,
                    e.getMessage());
            throw new AppException(ErrorCode.ENFORCEMENT_FAILED);
        }
    }

    private ReportedContentResponse fetchPost(String postId) {
        try {
            var response = postClient.getPostForModeration(postId);
            return response != null ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("Không lấy được bài viết {}: {}", postId, e.getMessage());
            return null;
        }
    }

    private ReportedContentResponse fetchComment(String commentId) {
        try {
            var response = interactionClient.getCommentForModeration(commentId);
            return response != null ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("Không lấy được bình luận {}: {}", commentId, e.getMessage());
            return null;
        }
    }

    // Với báo cáo nhắm vào tài khoản, chủ sở hữu chính là tài khoản đó — nhưng vẫn phải
    // kiểm tra tồn tại, nếu không mọi chuỗi bất kỳ đều mở được một hồ sơ rác.
    private String fetchUserId(String userId) {
        try {
            var response = identityClient.getUser(userId);
            return response != null && response.getResult() != null
                    ? response.getResult().getId()
                    : null;
        } catch (Exception e) {
            log.warn("Không lấy được tài khoản {}: {}", userId, e.getMessage());
            return null;
        }
    }

    private String fetchPostOwner(String postId) {
        try {
            var response = postClient.getPostOwner(postId);
            return response != null ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("Không lấy được chủ bài viết {}: {}", postId, e.getMessage());
            return null;
        }
    }

    private String fetchCommentOwner(String commentId) {
        try {
            var response = interactionClient.getCommentOwner(commentId);
            return response != null ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("Không lấy được chủ bình luận {}: {}", commentId, e.getMessage());
            return null;
        }
    }

    private String fetchGroupOwner(String groupId) {
        try {
            var response = groupClient.getGroup(groupId);
            if (response != null && response.getResult() != null) {
                return response.getResult().getOwnerId();
            }
        } catch (Exception e) {
            log.warn("Không lấy được group {}: {}", groupId, e.getMessage());
        }
        return null;
    }

    private String requireOwner(String ownerId, TargetType targetType, String targetId) {
        if (ownerId == null || ownerId.isBlank()) {
            log.info("Báo cáo tới đối tượng không tồn tại: {} {}", targetType, targetId);
            throw new AppException(ErrorCode.REPORT_TARGET_NOT_FOUND);
        }
        return ownerId;
    }
}
