package com.tien.moderationservice.service;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.tien.moderationservice.dto.PageResponse;
import com.tien.moderationservice.dto.request.AppealReviewRequest;
import com.tien.moderationservice.dto.request.CreateAppealRequest;
import com.tien.moderationservice.dto.response.AppealResponse;
import com.tien.moderationservice.entity.*;
import com.tien.moderationservice.exception.AppException;
import com.tien.moderationservice.exception.ErrorCode;
import com.tien.moderationservice.mapper.ModerationMapper;
import com.tien.moderationservice.repository.AppealRepository;
import com.tien.moderationservice.repository.ModerationCaseRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Khiếu nại quyết định kiểm duyệt. Không có bước này thì việc kiểm duyệt là một chiều:
 * người dùng bị xử lý sai không có đường phản hồi và hệ thống không đo được tỉ lệ quyết định sai.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AppealService {

    AppealRepository appealRepository;
    ModerationCaseRepository moderationCaseRepository;
    ModerationCaseService moderationCaseService;
    ModerationMapper moderationMapper;
    EnforcementService enforcementService;
    AuditLogService auditLogService;
    ModerationNotificationService notificationService;

    public AppealResponse createAppeal(CreateAppealRequest request) {
        String appellantId = getCurrentUserId();
        ModerationCase moderationCase = moderationCaseService.requireCase(request.getCaseId());

        // Chỉ người bị xử lý mới được khiếu nại hồ sơ của chính mình.
        if (!appellantId.equals(moderationCase.getTargetOwnerId())) {
            throw new AppException(ErrorCode.NOT_CASE_SUBJECT);
        }
        if (moderationCase.getStatus() != CaseStatus.ACTIONED) {
            throw new AppException(ErrorCode.APPEAL_NOT_ALLOWED);
        }
        if (appealRepository.existsByCaseId(moderationCase.getId())) {
            throw new AppException(ErrorCode.APPEAL_ALREADY_EXISTS);
        }

        Appeal appeal = appealRepository.save(Appeal.builder()
                .caseId(moderationCase.getId())
                .appellantId(appellantId)
                .reason(request.getReason())
                .status(AppealStatus.PENDING)
                .build());

        moderationCase.setStatus(CaseStatus.APPEALED);
        moderationCaseRepository.save(moderationCase);

        auditLogService.record(
                appellantId,
                AuditAction.APPEAL_CREATED,
                moderationCase.getTargetType(),
                moderationCase.getTargetId(),
                moderationCase.getId(),
                "Khiếu nại: " + request.getReason());

        return moderationMapper.toAppealResponse(appeal);
    }

    public PageResponse<AppealResponse> getMyAppeals(int page, int size) {
        String appellantId = getCurrentUserId();
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return toPageResponse(appealRepository.findAllByAppellantId(appellantId, pageable), page);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<AppealResponse> getAppealsByStatus(AppealStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").ascending());
        AppealStatus effective = status != null ? status : AppealStatus.PENDING;
        return toPageResponse(appealRepository.findAllByStatus(effective, pageable), page);
    }

    /**
     * Xét khiếu nại. UPHELD giữ nguyên quyết định, OVERTURNED khôi phục nội dung/tài khoản.
     * Cũng không đặt @Transactional vì lý do như {@link ModerationCaseService#decide}.
     */
    @PreAuthorize("hasRole('ADMIN')")
    public AppealResponse reviewAppeal(String appealId, AppealReviewRequest request) {
        String reviewerId = getCurrentUserId();
        Appeal appeal =
                appealRepository.findById(appealId).orElseThrow(() -> new AppException(ErrorCode.APPEAL_NOT_FOUND));

        if (appeal.getStatus() != AppealStatus.PENDING) {
            throw new AppException(ErrorCode.APPEAL_ALREADY_RESOLVED);
        }
        if (request.getDecision() != AppealStatus.UPHELD && request.getDecision() != AppealStatus.OVERTURNED) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        ModerationCase moderationCase = moderationCaseService.requireCase(appeal.getCaseId());
        boolean overturned = request.getDecision() == AppealStatus.OVERTURNED;

        if (overturned) {
            // Khôi phục trước; nếu service đích lỗi thì khiếu nại vẫn ở trạng thái PENDING để xử lý lại.
            try {
                enforcementService.revert(moderationCase, "Khôi phục sau khi chấp nhận khiếu nại " + appeal.getId());
            } catch (AppException e) {
                auditLogService.record(
                        reviewerId,
                        AuditAction.ENFORCEMENT_FAILED,
                        moderationCase.getTargetType(),
                        moderationCase.getTargetId(),
                        moderationCase.getId(),
                        "Không khôi phục được sau khiếu nại: " + e.getMessage());
                throw e;
            }
            auditLogService.record(
                    reviewerId,
                    AuditAction.ENFORCEMENT_REVERTED,
                    moderationCase.getTargetType(),
                    moderationCase.getTargetId(),
                    moderationCase.getId(),
                    "Đã khôi phục sau khi chấp nhận khiếu nại");
        }

        appeal.setStatus(request.getDecision());
        appeal.setReviewerId(reviewerId);
        appeal.setReviewNote(request.getNote());
        appeal.setResolvedAt(LocalDateTime.now());
        appeal = appealRepository.save(appeal);

        moderationCase.setStatus(overturned ? CaseStatus.REVERSED : CaseStatus.ACTIONED);
        moderationCaseRepository.save(moderationCase);

        auditLogService.record(
                reviewerId,
                AuditAction.APPEAL_REVIEWED,
                moderationCase.getTargetType(),
                moderationCase.getTargetId(),
                moderationCase.getId(),
                "Kết quả khiếu nại: " + request.getDecision()
                        + (request.getNote() != null ? " — " + request.getNote() : ""));

        notificationService.notifyAppealResult(appeal.getAppellantId(), moderationCase, overturned, request.getNote());

        return moderationMapper.toAppealResponse(appeal);
    }

    private PageResponse<AppealResponse> toPageResponse(Page<Appeal> pageData, int page) {
        return PageResponse.<AppealResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(pageData.getContent().stream()
                        .map(moderationMapper::toAppealResponse)
                        .toList())
                .build();
    }

    private String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
