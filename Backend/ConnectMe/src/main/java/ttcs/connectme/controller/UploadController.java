package ttcs.connectme.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.service.UploadService;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UploadController {
    UploadService uploadService;

    @PostMapping()
    public ResponseEntity<ApiResponse<String>> upload(@RequestParam("file") MultipartFile file) {
        try {
            ApiResponse<String> response = ApiResponse.<String>builder()
                    .message("Upload successfully")
                    .result(uploadService.uploadFile(file))
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new AppException(ErrorCode.FILE_UPLOAD_ERROR);
        }
    }
}
