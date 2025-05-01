package ttcs.connectme.dto.webrtc;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignalRequest {
    private String type; // "offer", "answer", "ice-candidate"
    private String from;
    private String targetUserId;
    private String meetingCode;
    private String payload; // JSON stringified SDP or ICE candidate
}