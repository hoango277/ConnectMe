package ttcs.connectme.dto.webrtc;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private Long id;
    private Long senderId;
    private String senderName;
    private String meetingCode;
    private String text;
    private String timestamp;
    private String type; // "user", "system"
}