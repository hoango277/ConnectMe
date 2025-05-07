package ttcs.connectme.dto.webrtc;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class FileSharedNotification {
    private String fileId;
    private String fileName;
    private String fileType;
    private long fileSize;
    private String downloadUrl;
    private String meetingCode;
    private Long senderId;
    private String senderName;
    private String timestamp;
}