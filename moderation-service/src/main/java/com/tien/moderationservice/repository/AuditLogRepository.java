package com.tien.moderationservice.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tien.moderationservice.entity.AuditLog;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    List<AuditLog> findAllByCaseIdOrderByCreatedAtAsc(String caseId);

    Page<AuditLog> findAllByActorIdOrderByCreatedAtDesc(String actorId, Pageable pageable);

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
