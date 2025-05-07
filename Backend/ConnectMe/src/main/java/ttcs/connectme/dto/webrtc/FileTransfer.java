package ttcs.connectme.dto.webrtc;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileTransfer {
    private Long senderId;
    private String senderName;
    private String meetingCode;
    private String fileName;
    private String fileType;
    private long fileSize;
    private String fileData; // Base64 encoded
    private String timestamp;
}