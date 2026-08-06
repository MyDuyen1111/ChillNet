package com.tien.moderationservice.entity;

// Loại đối tượng bị báo cáo. POST/COMMENT là nội dung, USER/GROUP là chủ thể.
public enum TargetType {
    POST,
    COMMENT,
    USER,
    GROUP
}
