package com.tien.moderationservice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tien.moderationservice.entity.CaseStatus;
import com.tien.moderationservice.entity.ModerationCase;
import com.tien.moderationservice.entity.TargetType;

@Repository
public interface ModerationCaseRepository extends JpaRepository<ModerationCase, String> {

    // Hồ sơ đang mở của một đối tượng — dùng để gộp báo cáo trùng.
    Optional<ModerationCase> findFirstByTargetTypeAndTargetIdAndStatusInOrderByCreatedAtDesc(
            TargetType targetType, String targetId, List<CaseStatus> statuses);

    Page<ModerationCase> findAllByStatus(CaseStatus status, Pageable pageable);

    Page<ModerationCase> findAllByTargetType(TargetType targetType, Pageable pageable);

    Page<ModerationCase> findAllByStatusAndTargetType(CaseStatus status, TargetType targetType, Pageable pageable);

    Page<ModerationCase> findAllByTargetOwnerIdAndStatusIn(
            String targetOwnerId, List<CaseStatus> statuses, Pageable pageable);

    long countByStatus(CaseStatus status);

    @Query("SELECT COUNT(c) FROM ModerationCase c WHERE c.status IN :statuses")
    long countByStatusIn(@Param("statuses") List<CaseStatus> statuses);
}
