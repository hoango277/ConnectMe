package ttcs.connectme.dto.webrtc;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinMeetingRequest {
    private String userId;
    private String meetingId;
}