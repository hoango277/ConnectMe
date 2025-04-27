package ttcs.connectme.dto.webrtc;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String id;
    private String senderId;
    private String senderName;
    private String meetingId;
    private String text;
    private String timestamp;
    private String type; // "user", "system"
}