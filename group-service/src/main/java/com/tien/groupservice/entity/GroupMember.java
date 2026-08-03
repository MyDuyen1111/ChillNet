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
@Document(value = "group_member")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GroupMember {
    @MongoId
    String id;

    String groupId;
    String userId;
    MemberRole role; // ADMIN, MODERATOR, MEMBER
    Instant joinedDate;
}
