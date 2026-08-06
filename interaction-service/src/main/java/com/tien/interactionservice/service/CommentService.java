package com.tien.interactionservice.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tien.interactionservice.dto.PageResponse;
import com.tien.interactionservice.dto.request.ContentModerationRequest;
import com.tien.interactionservice.dto.request.CreateCommentRequest;
import com.tien.interactionservice.dto.request.ModerationRequest;
import com.tien.interactionservice.dto.request.UpdateCommentRequest;
import com.tien.interactionservice.dto.response.CommentResponse;
import com.tien.interactionservice.dto.response.ModeratedContentResponse;
import com.tien.interactionservice.dto.response.ModerationResponse;
import com.tien.interactionservice.dto.response.ProfileResponse;
import com.tien.interactionservice.entity.Comment;
import com.tien.interactionservice.entity.ModerationStatus;
import com.tien.interactionservice.exception.AppException;
import com.tien.interactionservice.exception.ErrorCode;
import com.tien.interactionservice.mapper.CommentMapper;
import com.tien.interactionservice.repository.CommentRepository;
import com.tien.interactionservice.repository.LikeRepository;
import com.tien.interactionservice.repository.httpclient.AiClient;
import com.tien.interactionservice.repository.httpclient.PostClient;
import com.tien.interactionservice.repository.httpclient.ProfileClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CommentService {

    // Bình luận còn hiển thị với người khác. HIDDEN/REMOVED chỉ chủ bình luận còn thấy.
    private static final List<ModerationStatus> VISIBLE_STATUSES =
            List.of(ModerationStatus.VISIBLE, ModerationStatus.LIMITED);

    CommentRepository commentRepository;
    LikeRepository likeRepository;
    PostClient postClient;
    ProfileClient profileClient;
    AiClient aiClient;
    CommentMapper commentMapper;

    @Transactional
    public CommentResponse createComment(CreateCommentRequest request) {
        String userId = getCurrentUserId();

        // Validate post exists
        validatePostExists(request.getPostId());

        // Kiểm duyệt nội dung bình luận bằng AI (fail-open nếu ai-service không sẵn sàng)
        moderateContent(request.getContent());

        // If parent comment exists, validate it
        if (request.getParentCommentId() != null
                && !request.getParentCommentId().isEmpty()) {
            Comment parent = commentRepository
                    .findById(request.getParentCommentId())
                    .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));
            if (!parent.getPostId().equals(request.getPostId())) {
                throw new AppException(ErrorCode.INVALID_PARENT_COMMENT);
            }
        }

        Comment comment = Comment.builder()
                .postId(request.getPostId())
                .userId(userId)
                .content(request.getContent())
                .parentCommentId(request.getParentCommentId())
                .build();

        comment = commentRepository.save(comment);

        return buildCommentResponse(comment, userId);
    }

    public PageResponse<CommentResponse> getCommentsByPost(String postId, int page, int size) {
        String userId = getCurrentUserId();

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        Page<Comment> commentsPage =
                commentRepository.findVisibleRootComments(postId, userId, VISIBLE_STATUSES, pageable);

        List<CommentResponse> commentResponses = commentsPage.getContent().stream()
                .map(comment -> buildCommentResponse(comment, userId))
                .collect(Collectors.toList());

        if (!commentResponses.isEmpty()) {
            List<String> commentIds =
                    commentResponses.stream().map(CommentResponse::getId).toList();

            List<Comment> allReplies = commentRepository.findVisibleRepliesIn(commentIds, userId, VISIBLE_STATUSES);
            var repliesMap = allReplies.stream().collect(Collectors.groupingBy(Comment::getParentCommentId));

            commentResponses.forEach(commentResponse -> {
                List<Comment> replies = repliesMap.getOrDefault(commentResponse.getId(), List.of());
                List<CommentResponse> replyResponses = replies.stream()
                        .map(reply -> buildCommentResponse(reply, userId))
                        .collect(Collectors.toList());
                commentResponse.setReplies(replyResponses);
                commentResponse.setReplyCount(replies.size());
            });
        }

        return PageResponse.<CommentResponse>builder()
                .content(commentResponses)
                .page(page)
                .size(size)
                .totalElements(commentsPage.getTotalElements())
                .totalPages(commentsPage.getTotalPages())
                .hasNext(commentsPage.hasNext())
                .hasPrevious(commentsPage.hasPrevious())
                .build();
    }

    @Transactional
    public CommentResponse updateComment(String commentId, UpdateCommentRequest request) {
        String userId = getCurrentUserId();

        Comment comment = commentRepository
                .findByIdAndUserId(commentId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        comment.setContent(request.getContent());
        comment = commentRepository.save(comment);

        return buildCommentResponse(comment, userId);
    }

    @Transactional
    public void deleteComment(String commentId) {
        String userId = getCurrentUserId();

        Comment comment = commentRepository
                .findByIdAndUserId(commentId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        // Delete all replies first
        List<Comment> replies = commentRepository.findByParentCommentIdOrderByCreatedAtAsc(commentId);
        commentRepository.deleteAll(replies);

        // Delete likes on this comment
        likeRepository.deleteByCommentId(commentId);

        // Delete the comment
        commentRepository.delete(comment);
    }

    private CommentResponse buildCommentResponse(Comment comment, String currentUserId) {
        ProfileResponse profile = getProfile(comment.getUserId());

        long likeCount = likeRepository.countByCommentId(comment.getId());
        boolean isLiked = likeRepository
                .findByUserIdAndCommentIdAndPostIdIsNull(currentUserId, comment.getId())
                .isPresent();

        // Map các field có thể map từ entity
        CommentResponse response = commentMapper.toCommentResponse(comment);

        // Enrich các field không thể map
        // Hiển thị họ + tên thay vì username
        if (profile != null) {
            String displayName = getDisplayName(profile.getFirstName(), profile.getLastName(), profile.getUsername());
            response.setUsername(displayName);
            response.setUserAvatar(profile.getAvatar());
        } else {
            response.setUsername(null);
            response.setUserAvatar(null);
        }
        response.setReplies(new ArrayList<>());
        response.setReplyCount(0);
        response.setLikeCount((int) likeCount);
        response.setIsLiked(isLiked);

        return response;
    }

    private String getDisplayName(String firstName, String lastName, String username) {
        // Nếu có cả firstName và lastName, hiển thị "firstName lastName"
        if (firstName != null
                && !firstName.trim().isEmpty()
                && lastName != null
                && !lastName.trim().isEmpty()) {
            return (firstName.trim() + " " + lastName.trim()).trim();
        }
        // Nếu chỉ có lastName, hiển thị lastName (thường là username)
        else if (lastName != null && !lastName.trim().isEmpty()) {
            return lastName.trim();
        }
        // Nếu chỉ có firstName, hiển thị firstName
        else if (firstName != null && !firstName.trim().isEmpty()) {
            return firstName.trim();
        }
        // Fallback to username
        else {
            return username != null ? username : "";
        }
    }

    private void validatePostExists(String postId) {
        try {
            var response = postClient.checkPostExists(postId);
            if (response == null || response.getResult() == null || !response.getResult()) {
                throw new AppException(ErrorCode.POST_NOT_FOUND);
            }
        } catch (Exception e) {
            log.error("Error validating post existence: {}", e.getMessage());
            throw new AppException(ErrorCode.POST_NOT_FOUND);
        }
    }

    private ProfileResponse getProfile(String userId) {
        try {
            return profileClient.getProfile(userId).getResult();
        } catch (Exception e) {
            log.error("Error getting profile for userId: {}", userId, e);
            return null;
        }
    }

    public long getCommentCountByPost(String postId) {
        // Bình luận đã bị kiểm duyệt gỡ không tính vào số hiển thị trên bài viết.
        return commentRepository.countVisibleByPostId(postId, VISIBLE_STATUSES);
    }

    public CommentResponse getCommentById(String commentId) {
        String userId = getCurrentUserId();
        Comment comment =
                commentRepository.findById(commentId).orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));
        if (!isViewableBy(comment, userId)) {
            throw new AppException(ErrorCode.COMMENT_NOT_FOUND);
        }
        return buildCommentResponse(comment, userId);
    }

    public PageResponse<CommentResponse> getRepliesByCommentId(String commentId, int page, int size) {
        String userId = getCurrentUserId();

        // Verify comment exists
        Comment parentComment =
                commentRepository.findById(commentId).orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").ascending());

        // Get all replies for this comment
        List<Comment> allReplies = commentRepository.findVisibleReplies(commentId, userId, VISIBLE_STATUSES);

        // Manual pagination since we don't have Page query
        int start = (page - 1) * size;
        int end = Math.min(start + size, allReplies.size());
        List<Comment> paginatedReplies = start < allReplies.size() ? allReplies.subList(start, end) : List.of();

        List<CommentResponse> replyResponses = paginatedReplies.stream()
                .map(reply -> buildCommentResponse(reply, userId))
                .collect(Collectors.toList());

        int totalPages = (int) Math.ceil((double) allReplies.size() / size);

        return PageResponse.<CommentResponse>builder()
                .content(replyResponses)
                .page(page)
                .size(size)
                .totalElements((long) allReplies.size())
                .totalPages(totalPages)
                .hasNext(end < allReplies.size())
                .hasPrevious(page > 1)
                .build();
    }

    private String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // ===== Kiểm duyệt: chỉ được gọi từ moderation-service qua InternalInteractionController =====

    // Chủ bình luận — dùng để xác thực đối tượng khi người dùng gửi báo cáo.
    public String getCommentOwner(String commentId) {
        return commentRepository
                .findById(commentId)
                .map(Comment::getUserId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));
    }

    // Ảnh chụp bình luận cho kiểm duyệt viên xem trước khi ra quyết định.
    public ModeratedContentResponse getCommentForModeration(String commentId) {
        Comment comment =
                commentRepository.findById(commentId).orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        return ModeratedContentResponse.builder()
                .id(comment.getId())
                .ownerId(comment.getUserId())
                .content(comment.getContent())
                .moderationStatus(
                        comment.getModerationStatus() != null
                                ? comment.getModerationStatus().name()
                                : ModerationStatus.VISIBLE.name())
                .createdAt(
                        comment.getCreatedAt() != null ? comment.getCreatedAt().toString() : null)
                .build();
    }

    /**
     * Đặt trạng thái kiểm duyệt cho bình luận. Không xóa bản ghi kể cả với REMOVED
     * vì quyết định còn có thể bị khiếu nại và đảo ngược.
     */
    @Transactional
    public void applyModeration(String commentId, ContentModerationRequest request) {
        Comment comment =
                commentRepository.findById(commentId).orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        ModerationStatus status;
        try {
            status = ModerationStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new AppException(ErrorCode.INVALID_MODERATION_STATUS);
        }

        comment.setModerationStatus(status);
        comment.setModerationCaseId(request.getCaseId());
        commentRepository.save(comment);

        log.info(
                "Bình luận {} chuyển sang trạng thái kiểm duyệt {} (hồ sơ {})", commentId, status, request.getCaseId());
    }

    // Bình luận bị ẩn/gỡ chỉ còn chủ bình luận thấy được.
    private boolean isViewableBy(Comment comment, String viewerId) {
        ModerationStatus status = comment.getModerationStatus();
        if (status == null || VISIBLE_STATUSES.contains(status)) {
            return true;
        }
        return comment.getUserId().equals(viewerId);
    }

    // Gọi ai-service kiểm duyệt bình luận. Fail-open: AI lỗi/không cấu hình thì vẫn
    // cho đăng. Chỉ chặn khi bị gắn cờ mức HIGH.
    private void moderateContent(String content) {
        if (content == null || content.trim().isEmpty()) {
            return;
        }
        ModerationResponse verdict;
        try {
            var response = aiClient.moderate(
                    ModerationRequest.builder().text(content).context("COMMENT").build());
            verdict = (response != null) ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("AI moderation không khả dụng, bỏ qua kiểm duyệt: {}", e.getMessage());
            return;
        }
        if (verdict != null && verdict.isFlagged() && "HIGH".equalsIgnoreCase(verdict.getSeverity())) {
            log.info("Bình luận bị chặn bởi kiểm duyệt AI: {}", verdict.getReason());
            throw new AppException(ErrorCode.CONTENT_VIOLATION);
        }
    }
}
