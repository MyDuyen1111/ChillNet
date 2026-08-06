package com.tien.moderationservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.tien.moderationservice.entity.ReportReason;
import com.tien.moderationservice.entity.TargetType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateReportRequest {

    @NotNull(message = "Thiếu loại đối tượng bị báo cáo")
    TargetType targetType;

    @NotBlank(message = "Thiếu ID đối tượng bị báo cáo")
    String targetId;

    @NotNull(message = "Thiếu lý do báo cáo")
    ReportReason reason;

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    String description;
}
