package com.tien.moderationservice.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tien.moderationservice.entity.Report;
import com.tien.moderationservice.entity.ReportStatus;
import com.tien.moderationservice.entity.TargetType;

@Repository
public interface ReportRepository extends JpaRepository<Report, String> {

    Page<Report> findAllByReporterId(String reporterId, Pageable pageable);

    List<Report> findAllByCaseId(String caseId);

    // Chặn một người báo cáo nhiều lần cùng một đối tượng khi hồ sơ vẫn chưa xử lý xong.
    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(
            String reporterId, TargetType targetType, String targetId, List<ReportStatus> statuses);

    long countByCaseId(String caseId);
}
