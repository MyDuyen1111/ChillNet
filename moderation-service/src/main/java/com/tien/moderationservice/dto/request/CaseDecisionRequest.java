package com.tien.moderationservice.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.tien.moderationservice.entity.ModerationAction;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CaseDecisionRequest {

    @NotNull(message = "Thiếu biện pháp xử lý")
    ModerationAction action;

    @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
    String note;

    // Chỉ dùng cho SUSPEND_ACCOUNT. Bỏ trống thì mặc định 7 ngày.
    @Min(value = 1, message = "Thời hạn khóa tối thiểu 1 ngày")
    @Max(value = 365, message = "Thời hạn khóa tối đa 365 ngày")
    Integer suspendDays;
}
