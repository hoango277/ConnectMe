package ttcs.connectme.dto.response;

import lombok.*;
import ttcs.connectme.enums.MeetingStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingResponse {
    private String title;
    private String description;
    private String meetingCode;
    private Long hostId;
    private LocalDateTime actualStart;
    private LocalDateTime actualEnd;
    private MeetingStatus meetingStatus;
    private Integer currentParticipants;
    private Integer totalParticipants;
    private Integer chatMessageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
