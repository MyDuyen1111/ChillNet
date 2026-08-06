package com.tien.interactionservice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tien.interactionservice.entity.Comment;
import com.tien.interactionservice.entity.ModerationStatus;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {
    Page<Comment> findByPostIdAndParentCommentIdIsNull(String postId, Pageable pageable);

    List<Comment> findByParentCommentIdOrderByCreatedAtAsc(String parentCommentId);

    List<Comment> findByParentCommentIdInOrderByCreatedAtAsc(List<String> parentCommentIds);

    Optional<Comment> findByIdAndUserId(String id, String userId);

    // Các truy vấn dưới đây loại bỏ bình luận đã bị kiểm duyệt ẩn/gỡ.
    // moderationStatus IS NULL là bình luận có từ trước khi có tính năng kiểm duyệt.
    // Chủ bình luận vẫn thấy bình luận của mình để biết mình bị xử lý.
    @Query("SELECT c FROM Comment c WHERE c.postId = :postId AND c.parentCommentId IS NULL "
            + "AND (c.moderationStatus IS NULL OR c.moderationStatus IN :visibleStatuses OR c.userId = :viewerId)")
    Page<Comment> findVisibleRootComments(
            @Param("postId") String postId,
            @Param("viewerId") String viewerId,
            @Param("visibleStatuses") List<ModerationStatus> visibleStatuses,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.parentCommentId IN :parentIds "
            + "AND (c.moderationStatus IS NULL OR c.moderationStatus IN :visibleStatuses OR c.userId = :viewerId) "
            + "ORDER BY c.createdAt ASC")
    List<Comment> findVisibleRepliesIn(
            @Param("parentIds") List<String> parentIds,
            @Param("viewerId") String viewerId,
            @Param("visibleStatuses") List<ModerationStatus> visibleStatuses);

    @Query("SELECT c FROM Comment c WHERE c.parentCommentId = :parentId "
            + "AND (c.moderationStatus IS NULL OR c.moderationStatus IN :visibleStatuses OR c.userId = :viewerId) "
            + "ORDER BY c.createdAt ASC")
    List<Comment> findVisibleReplies(
            @Param("parentId") String parentId,
            @Param("viewerId") String viewerId,
            @Param("visibleStatuses") List<ModerationStatus> visibleStatuses);

    @Query("SELECT COUNT(c) FROM Comment c WHERE c.postId = :postId "
            + "AND (c.moderationStatus IS NULL OR c.moderationStatus IN :visibleStatuses)")
    long countVisibleByPostId(
            @Param("postId") String postId, @Param("visibleStatuses") List<ModerationStatus> visibleStatuses);

    @Query("SELECT COUNT(c) FROM Comment c WHERE c.postId = :postId")
    long countByPostId(@Param("postId") String postId);

    void deleteByPostId(String postId);

    void deleteByUserId(String userId);
}
