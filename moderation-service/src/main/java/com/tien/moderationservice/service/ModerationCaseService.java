package com.tien.moderationservice.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.tien.moderationservice.dto.PageResponse;
import com.tien.moderationservice.dto.request.CaseDecisionRequest;
import com.tien.moderationservice.dto.request.CaseRevertRequest;
import com.tien.moderationservice.dto.response.*;
import com.tien.moderationservice.entity.*;
import com.tien.moderationservice.exception.AppException;
import com.tien.moderationservice.exception.ErrorCode;
import com.tien.moderationservice.mapper.ModerationMapper;
import com.tien.moderationservice.repository.AppealRepository;
import com.tien.moderationservice.repository.ModerationCaseRepository;
import com.tien.moderationservice.repository.ReportRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Hàng đợi kiểm duyệt và việc ra quyết định.
 * Toàn bộ phần quản trị yêu cầu ROLE_ADMIN — kiểm tra ngay ở tầng service để đường Feign
 * hay đường gọi thẳng vào port service cũng không lách được.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ModerationCaseService {

    // Thời hạn khóa tài khoản mặc định khi kiểm duyệt viên không nêu rõ.
    private static final int DEFAULT_SUSPEND_DAYS = 7;

    private static final List<CaseStatus> DECIDABLE_STATUSES = List.of(CaseStatus.OPEN, CaseStatus.IN_REVIEW);

    // Hồ sơ mà người bị xử lý được phép nhìn thấy: chỉ những hồ sơ đã có quyết định.
    private static final List<CaseStatus> VISIBLE_TO_SUBJECT_STATUSES =
            List.of(CaseStatus.ACTIONED, CaseStatus.APPEALED, CaseStatus.REVERSED);

    ModerationCaseRepository moderationCaseRepository;
    ReportRepository reportRepository;
    AppealRepository appealRepository;
    ModerationMapper moderationMapper;
    EnforcementService enforcementService;
    AuditLogService auditLogService;
    ModerationNotificationService notificationService;

    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<ModerationCaseResponse> getQueue(CaseStatus status, TargetType targetType, int page, int size) {
        // Hồ sơ nghiêm trọng trước, cùng mức thì cũ trước để không ai bị bỏ quên.
        Pageable pageable =
                PageRequest.of(page - 1, size, Sort.by(Sort.Order.desc("priority"), Sort.Order.asc("createdAt")));

        Page<ModerationCase> pageData;
        if (status != null && targetType != null) {
            pageData = moderationCaseRepository.findAllByStatusAndTargetType(status, targetType, pageable);
        } else if (status != null) {
            pageData = moderationCaseRepository.findAllByStatus(status, pageable);
        } else if (targetType != null) {
            pageData = moderationCaseRepository.findAllByTargetType(targetType, pageable);
        } else {
            pageData = moderationCaseRepository.findAll(pageable);
        }

        return toPageResponse(pageData, page);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public ModerationCaseDetailResponse getCaseDetail(String caseId) {
        ModerationCase moderationCase = requireCase(caseId);

        return ModerationCaseDetailResponse.builder()
                .moderationCase(moderationMapper.toCaseResponse(moderationCase))
                .reports(moderationMapper.toReportResponses(reportRepository.findAllByCaseId(caseId)))
                .appeal(appealRepository
                        .findByCaseId(caseId)
                        .map(moderationMapper::toAppealResponse)
                        .orElse(null))
                .auditLogs(moderationMapper.toAuditLogResponses(auditLogService.findByCase(caseId)))
                .content(enforcementService.fetchContentSnapshot(
                        moderationCase.getTargetType(), moderationCase.getTargetId()))
                .build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditLogResponse> getCaseAuditLogs(String caseId) {
        requireCase(caseId);
        return moderationMapper.toAuditLogResponses(auditLogService.findByCase(caseId));
    }

    // Kiểm duyệt viên nhận hồ sơ về xử lý.
    @PreAuthorize("hasRole('ADMIN')")
    public ModerationCaseResponse assignToMe(String caseId) {
        String moderatorId = getCurrentUserId();
        ModerationCase moderationCase = requireCase(caseId);

        if (!DECIDABLE_STATUSES.contains(moderationCase.getStatus())) {
            throw new AppException(ErrorCode.CASE_ALREADY_CLOSED);
        }

        moderationCase.setAssigneeId(moderatorId);
        moderationCase.setStatus(CaseStatus.IN_REVIEW);
        moderationCase = moderationCaseRepository.save(moderationCase);

        List<Report> reports = reportRepository.findAllByCaseId(caseId);
        reports.forEach(report -> {
            if (report.getStatus() == ReportStatus.PENDING) {
                report.setStatus(ReportStatus.UNDER_REVIEW);
            }
        });
        reportRepository.saveAll(reports);

        auditLogService.record(
                moderatorId,
                AuditAction.CASE_ASSIGNED,
                moderationCase.getTargetType(),
                moderationCase.getTargetId(),
                caseId,
                "Nhận xử lý hồ sơ");

        return moderationMapper.toCaseResponse(moderationCase);
    }

    /**
     * Ra quyết định cho hồ sơ và thực thi biện pháp.
     *
     * Cố tình KHÔNG đặt @Transactional: nếu việc thực thi sang service khác thất bại, ta vẫn muốn
     * giữ lại dòng nhật ký ENFORCEMENT_FAILED, đồng thời hồ sơ phải ở nguyên trạng thái cũ để
     * kiểm duyệt viên thử lại.
     */
    @PreAuthorize("hasRole('ADMIN')")
    public ModerationCaseResponse decide(String caseId, CaseDecisionRequest request) {
        String moderatorId = getCurrentUserId();
        ModerationCase moderationCase = requireCase(caseId);

        if (!DECIDABLE_STATUSES.contains(moderationCase.getStatus())) {
            throw new AppException(ErrorCode.CASE_ALREADY_CLOSED);
        }

        ModerationAction action = request.getAction();
        enforcementService.validateAction(moderationCase, action);

        LocalDateTime suspendedUntil = null;
        if (action == ModerationAction.SUSPEND_ACCOUNT) {
            int days = request.getSuspendDays() != null ? request.getSuspendDays() : DEFAULT_SUSPEND_DAYS;
            suspendedUntil = LocalDateTime.now().plusDays(days);
        }

        // Thực thi trước, ghi quyết định sau. open-in-view đang bật nên thực thể vẫn nằm trong
        // session: nếu sửa nó trước rồi save() dòng nhật ký thất bại bên dưới, Hibernate sẽ flush
        // luôn cả quyết định chưa thực thi được.
        try {
            enforcementService.apply(moderationCase, action, suspendedUntil, request.getNote());
        } catch (AppException e) {
            auditLogService.record(
                    moderatorId,
                    AuditAction.ENFORCEMENT_FAILED,
                    moderationCase.getTargetType(),
                    moderationCase.getTargetId(),
                    caseId,
                    "Không thực thi được biện pháp " + action + ": " + e.getMessage());
            throw e;
        }

        boolean violated = action != ModerationAction.NONE;
        moderationCase.setAction(action);
        moderationCase.setDecisionNote(request.getNote());
        moderationCase.setDecidedBy(moderatorId);
        moderationCase.setDecidedAt(LocalDateTime.now());
        moderationCase.setSuspendedUntil(suspendedUntil);
        moderationCase.setStatus(violated ? CaseStatus.ACTIONED : CaseStatus.DISMISSED);
        moderationCase = moderationCaseRepository.save(moderationCase);

        List<Report> reports = reportRepository.findAllByCaseId(caseId);
        reports.forEach(report -> report.setStatus(violated ? ReportStatus.RESOLVED : ReportStatus.REJECTED));
        reportRepository.saveAll(reports);

        auditLogService.record(
                moderatorId,
                AuditAction.CASE_DECIDED,
                moderationCase.getTargetType(),
                moderationCase.getTargetId(),
                caseId,
                "Quyết định: " + action + (request.getNote() != null ? " — " + request.getNote() : ""));
        if (violated && action != ModerationAction.WARN) {
            auditLogService.record(
                    moderatorId,
                    AuditAction.ENFORCEMENT_APPLIED,
                    moderationCase.getTargetType(),
                    moderationCase.getTargetId(),
                    caseId,
                    "Đã áp dụng " + action + (suspendedUntil != null ? " đến " + suspendedUntil : ""));
        }

        if (violated) {
            notificationService.notifyDecision(moderationCase, action.name());
        }
        Set<String> reporterIds = reports.stream().map(Report::getReporterId).collect(Collectors.toSet());
        ModerationCase decided = moderationCase;
        reporterIds.forEach(reporterId -> notificationService.notifyReporter(reporterId, decided, violated));

        return moderationMapper.toCaseResponse(moderationCase);
    }

    /**
     * Gỡ biện pháp đã áp dụng mà không cần người bị xử lý khiếu nại.
     *
     * Bắt buộc phải có đường này: tài khoản bị SUSPEND/BAN không gọi được bất kỳ API nào qua
     * gateway (introspect chặn ngay), nên họ không tự gửi khiếu nại được. Nếu đường gỡ duy nhất
     * là khiếu nại thì một quyết định khóa nhầm sẽ không có cách nào sửa.
     *
     * Hồ sơ đang có khiếu nại chờ xử lý thì phải đi qua luồng xét khiếu nại, không dùng đường này.
     */
    @PreAuthorize("hasRole('ADMIN')")
    public ModerationCaseResponse revertDecision(String caseId, CaseRevertRequest request) {
        String moderatorId = getCurrentUserId();
        ModerationCase moderationCase = requireCase(caseId);

        if (moderationCase.getStatus() != CaseStatus.ACTIONED) {
            throw new AppException(ErrorCode.CASE_NOT_ACTIONED);
        }

        enforcementService.revert(moderationCase, request.getReason());

        moderationCase.setStatus(CaseStatus.REVERSED);
        moderationCase = moderationCaseRepository.save(moderationCase);

        auditLogService.record(
                moderatorId,
                AuditAction.ENFORCEMENT_REVERTED,
                moderationCase.getTargetType(),
                moderationCase.getTargetId(),
                caseId,
                "Quản trị gỡ biện pháp: " + request.getReason());

        notificationService.notifyReverted(moderationCase, request.getReason());

        return moderationMapper.toCaseResponse(moderationCase);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public ModerationStatsResponse getStats() {
        return ModerationStatsResponse.builder()
                .openCases(moderationCaseRepository.countByStatus(CaseStatus.OPEN))
                .inReviewCases(moderationCaseRepository.countByStatus(CaseStatus.IN_REVIEW))
                .actionedCases(moderationCaseRepository.countByStatus(CaseStatus.ACTIONED))
                .dismissedCases(moderationCaseRepository.countByStatus(CaseStatus.DISMISSED))
                .reversedCases(moderationCaseRepository.countByStatus(CaseStatus.REVERSED))
                .pendingAppeals(appealRepository.countByStatus(AppealStatus.PENDING))
                .totalReports(reportRepository.count())
                .build();
    }

    // Người dùng xem các quyết định đã áp dụng lên mình — cơ sở để khiếu nại.
    public PageResponse<ModerationCaseResponse> getCasesAgainstMe(int page, int size) {
        String userId = getCurrentUserId();
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());

        // Lọc ngay trong truy vấn chứ không lọc sau khi phân trang, để totalElements khớp dữ liệu.
        // Hồ sơ đang điều tra (OPEN/IN_REVIEW) cố tình không hiển thị cho người bị báo cáo.
        Page<ModerationCase> pageData = moderationCaseRepository.findAllByTargetOwnerIdAndStatusIn(
                userId, VISIBLE_TO_SUBJECT_STATUSES, pageable);

        return toPageResponse(pageData, page);
    }

    ModerationCase requireCase(String caseId) {
        return moderationCaseRepository.findById(caseId).orElseThrow(() -> new AppException(ErrorCode.CASE_NOT_FOUND));
    }

    private PageResponse<ModerationCaseResponse> toPageResponse(Page<ModerationCase> pageData, int page) {
        return PageResponse.<ModerationCaseResponse>builder()
                .currentPage(page)
                .pageSize(pageData.getSize())
                .totalPages(pageData.getTotalPages())
                .totalElements(pageData.getTotalElements())
                .data(pageData.getContent().stream()
                        .map(moderationMapper::toCaseResponse)
                        .toList())
                .build();
    }

    private String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
