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
public class CaseRevertRequest {

    @NotBlank(message = "Cần nêu lý do gỡ biện pháp")
    @Size(max = 2000, message = "Lý do tối đa 2000 ký tự")
    String reason;
}
