package com.tien.moderationservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateAppealRequest {

    @NotBlank(message = "Thiếu ID hồ sơ kiểm duyệt")
    String caseId;

    @NotBlank(message = "Cần nêu lý do khiếu nại")
    @Size(max = 2000, message = "Lý do khiếu nại tối đa 2000 ký tự")
    String reason;
}
