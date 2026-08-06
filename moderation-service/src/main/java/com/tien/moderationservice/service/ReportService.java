package com.tien.moderationservice.service;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tien.moderationservice.dto.PageResponse;
import com.tien.moderationservice.dto.request.CreateReportRequest;
import com.tien.moderationservice.dto.response.ReportResponse;
import com.tien.moderationservice.entity.*;
import com.tien.moderationservice.exception.AppException;
import com.tien.moderationservice.exception.ErrorCode;
import com.tien.moderationservice.mapper.ModerationMapper;
import com.tien.moderationservice.repository.ModerationCaseRepository;
import com.tien.moderationservice.repository.ReportRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Tiếp nhận báo cáo từ người dùng và gộp chúng thành hồ sơ kiểm duyệt.
 * Nhiều người báo cáo cùng một nội dung chỉ tạo ra một hồ sơ — kiểm duyệt viên xử lý một lần.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportService {

    // Số báo cáo trên cùng một đối tượng đủ để nâng một bậc mức nghiêm trọng.
    private static final int ESCALATION_THRESHOLD = 5;

    private static final List<ReportStatus> ACTIVE_REPORT_STATUSES =
            List.of(ReportStatus.PENDING, ReportStatus.UNDER_REVIEW);
    private static final List<CaseStatus> OPEN_CASE_STATUSES =
            List.of(CaseStatus.OPEN, CaseStatus.IN_REVIEW, CaseStatus.APPEALED);

    ReportRepository reportRepository;
    ModerationCaseRepository moderationCaseRepository;
    ModerationMapper moderationMapper;
    EnforcementService enforcementService;
    AuditLogService auditLogService;

    @Transactional
    public ReportResponse createReport(CreateReportRequest request) {
        String reporterId = getCurrentUserId();

        // Đối tượng phải tồn tại thật; đồng thời lấy chủ sở hữu để biết ai bị ảnh hưởng.
        String targetOwnerId = enforcementService.resolveTargetOwner(request.getTargetType(), request.getTargetId());

        if (reporterId.equals(targetOwnerId)) {
            throw new AppException(ErrorCode.CANNOT_REPORT_SELF);
        }

        // Một người chỉ báo cáo một đối tượng một lần khi hồ sơ chưa xử lý xong.
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(
                reporterId, request.getTargetType(), request.getTargetId(), ACTIVE_REPORT_STATUSES)) {
            throw new AppException(ErrorCode.REPORT_ALREADY_SUBMITTED);
        }

        CaseSeverity severity = severityOf(request.getReason());
        ModerationCase moderationCase = findOrOpenCase(request, targetOwnerId, severity);

        Report report = Report.builder()
                .reporterId(reporterId)
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .targetOwnerId(targetOwnerId)
                .reason(request.getReason())
                .description(request.getDescription())
                .severity(severity)
                .status(
                        moderationCase.getStatus() == CaseStatus.OPEN
                                ? ReportStatus.PENDING
                                : ReportStatus.UNDER_REVIEW)
                .caseId(moderationCase.getId())
                .build();
        report = reportRepository.save(report);

        // Cập nhật hồ sơ: đếm báo cáo và nâng mức nghiêm trọng nếu cần.
        moderationCase.setReportCount(moderationCase.getReportCount() + 1);
        moderationCase.setSeverity(escalate(moderationCase.getSeverity(), severity, moderationCase.getReportCount()));
        moderationCaseRepository.save(moderationCase);

        auditLogService.record(
                reporterId,
                AuditAction.REPORT_CREATED,
                request.getTargetType(),
                request.getTargetId(),
                moderationCase.getId(),
                "Lý do: " + request.getReason());

        return moderationMapper.toReportResponse(report);
    }

    public PageResponse<ReportResponse> getMyReports(int page, int size) {
        String reporterId = getCurrentUserId();
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        var pageData = reportRepository.findAllByReporterId(reporterId, pageable);

        return PageResponse.<ReportResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(moderationMapper.toReportResponses(pageData.getContent()))
                .build();
    }

    private ModerationCase findOrOpenCase(CreateReportRequest request, String targetOwnerId, CaseSeverity severity) {
        return moderationCaseRepository
                .findFirstByTargetTypeAndTargetIdAndStatusInOrderByCreatedAtDesc(
                        request.getTargetType(), request.getTargetId(), OPEN_CASE_STATUSES)
                .orElseGet(() -> {
                    ModerationCase created = moderationCaseRepository.save(ModerationCase.builder()
                            .targetType(request.getTargetType())
                            .targetId(request.getTargetId())
                            .targetOwnerId(targetOwnerId)
                            .status(CaseStatus.OPEN)
                            .severity(severity)
                            .reportCount(0)
                            .build());
                    auditLogService.record(
                            AuditLogService.SYSTEM_ACTOR,
                            AuditAction.CASE_OPENED,
                            request.getTargetType(),
                            request.getTargetId(),
                            created.getId(),
                            "Mở hồ sơ từ báo cáo đầu tiên");
                    return created;
                });
    }

    // Mức nghiêm trọng ban đầu suy ra từ lý do báo cáo.
    private CaseSeverity severityOf(ReportReason reason) {
        return switch (reason) {
            case CHILD_SAFETY -> CaseSeverity.CRITICAL;
            case SELF_HARM, VIOLENCE, HATE_SPEECH -> CaseSeverity.HIGH;
            case HARASSMENT, SEXUAL_CONTENT, SCAM, IMPERSONATION -> CaseSeverity.MEDIUM;
            case SPAM, MISINFORMATION, COPYRIGHT, OTHER -> CaseSeverity.LOW;
        };
    }

    // Hồ sơ lấy mức cao nhất trong các báo cáo, và được nâng thêm một bậc khi có nhiều người cùng báo cáo.
    private CaseSeverity escalate(CaseSeverity current, CaseSeverity incoming, int reportCount) {
        CaseSeverity highest = current.ordinal() >= incoming.ordinal() ? current : incoming;
        if (reportCount < ESCALATION_THRESHOLD) {
            return highest;
        }
        CaseSeverity[] levels = CaseSeverity.values();
        return levels[Math.min(highest.ordinal() + 1, levels.length - 1)];
    }

    private String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
