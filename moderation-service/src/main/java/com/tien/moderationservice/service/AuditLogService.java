package com.tien.moderationservice.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.tien.moderationservice.entity.AuditAction;
import com.tien.moderationservice.entity.AuditLog;
import com.tien.moderationservice.entity.TargetType;
import com.tien.moderationservice.repository.AuditLogRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Ghi nhật ký kiểm toán cho mọi thao tác kiểm duyệt.
 * Chỉ có thao tác ghi thêm và đọc — không có sửa/xóa, kể cả cho quản trị viên.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuditLogService {

    public static final String SYSTEM_ACTOR = "SYSTEM";

    AuditLogRepository auditLogRepository;

    public void record(
            String actorId, AuditAction action, TargetType targetType, String targetId, String caseId, String detail) {
        AuditLog entry = AuditLog.builder()
                .actorId(actorId != null ? actorId : SYSTEM_ACTOR)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .caseId(caseId)
                .detail(detail)
                .build();
        auditLogRepository.save(entry);
        log.info("Audit: actor={} action={} case={} target={}/{}", actorId, action, caseId, targetType, targetId);
    }

    public List<AuditLog> findByCase(String caseId) {
        return auditLogRepository.findAllByCaseIdOrderByCreatedAtAsc(caseId);
    }

    public Page<AuditLog> findRecent(int page, int size) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page - 1, size));
    }
}
