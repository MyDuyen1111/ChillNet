package com.tien.identityservice.constant;

/**
 * Trạng thái tài khoản theo góc độ kiểm duyệt, tách khỏi cờ isActive (vốn dùng cho việc xác minh email).
 * Tài khoản cũ chưa có giá trị — null được coi là ACTIVE.
 */
public enum AccountStatus {
    ACTIVE,
    SUSPENDED, // khóa có thời hạn, hết hạn thì tự mở lại
    BANNED // khóa vĩnh viễn
}
