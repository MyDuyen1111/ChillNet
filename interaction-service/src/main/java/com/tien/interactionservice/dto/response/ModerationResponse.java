package com.tien.interactionservice.dto.response;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModerationResponse {
    boolean flagged;
    String severity; // NONE | LOW | MEDIUM | HIGH
    List<String> categories;
    String reason;
}
