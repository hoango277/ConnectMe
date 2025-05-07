package ttcs.connectme.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    private String fileId; // Sẽ là tên file duy nhất được lưu trên server
    private String fileName; // Tên file gốc
    private String fileType;
    private long fileSize;
    private String downloadUrl; // URL để client khác có thể tải file
    private String meetingCode;
}