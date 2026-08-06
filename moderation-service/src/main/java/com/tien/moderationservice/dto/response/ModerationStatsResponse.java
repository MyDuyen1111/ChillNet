package com.tien.moderationservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

// Số liệu cho dashboard quản trị.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModerationStatsResponse {
    long openCases;
    long inReviewCases;
    long actionedCases;
    long dismissedCases;
    long reversedCases;
    long pendingAppeals;
    long totalReports;
}
