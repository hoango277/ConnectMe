package ttcs.connectme.dto.webrtc;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaStateUpdate {
    private String userId;
    private String meetingId;
    private String mediaType; // "audio", "video"
    private boolean enabled;
}