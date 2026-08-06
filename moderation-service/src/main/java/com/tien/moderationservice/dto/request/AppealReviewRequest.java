package com.tien.moderationservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.tien.moderationservice.entity.AppealStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AppealReviewRequest {

    // Chỉ nhận UPHELD (giữ nguyên) hoặc OVERTURNED (đảo ngược quyết định).
    @NotNull(message = "Thiếu kết quả xét khiếu nại")
    AppealStatus decision;

    @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
    String note;
}
