package com.tien.moderationservice.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tien.moderationservice.entity.Appeal;
import com.tien.moderationservice.entity.AppealStatus;

@Repository
public interface AppealRepository extends JpaRepository<Appeal, String> {

    Optional<Appeal> findByCaseId(String caseId);

    boolean existsByCaseId(String caseId);

    Page<Appeal> findAllByAppellantId(String appellantId, Pageable pageable);

    Page<Appeal> findAllByStatus(AppealStatus status, Pageable pageable);

    long countByStatus(AppealStatus status);
}
