package com.tien.groupservice.entity;

import java.time.Instant;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@Document(value = "join_request")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JoinRequest {
    @MongoId
    String id;

    String groupId;
    String userId;
    RequestStatus status; // PENDING, APPROVED, REJECTED
    String message; // Lời nhắn của người xin tham gia
    Instant requestedDate;
    Instant reviewedDate;
    String reviewedBy; // Admin/Moderator đã xem xét
}
