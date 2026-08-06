package com.tien.moderationservice.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import com.tien.moderationservice.dto.response.AppealResponse;
import com.tien.moderationservice.dto.response.AuditLogResponse;
import com.tien.moderationservice.dto.response.ModerationCaseResponse;
import com.tien.moderationservice.dto.response.ReportResponse;
import com.tien.moderationservice.entity.Appeal;
import com.tien.moderationservice.entity.AuditLog;
import com.tien.moderationservice.entity.ModerationCase;
import com.tien.moderationservice.entity.Report;

@Mapper(componentModel = "spring")
public interface ModerationMapper {
    ReportResponse toReportResponse(Report report);

    List<ReportResponse> toReportResponses(List<Report> reports);

    ModerationCaseResponse toCaseResponse(ModerationCase moderationCase);

    AppealResponse toAppealResponse(Appeal appeal);

    AuditLogResponse toAuditLogResponse(AuditLog auditLog);

    List<AuditLogResponse> toAuditLogResponses(List<AuditLog> auditLogs);
}
