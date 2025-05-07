package ttcs.connectme.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@Service
public class S3Service {

    private final AmazonS3 amazonS3;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public S3Service(AmazonS3 amazonS3) {
        this.amazonS3 = amazonS3;
    }

    public String uploadFile(MultipartFile file) throws IOException {
        // Tạo tên file duy nhất (có thể dùng UUID hoặc tên gốc)
        String fileName = file.getOriginalFilename();

        // Upload file lên S3
        amazonS3.putObject(new PutObjectRequest(bucketName, fileName, file.getInputStream(), null));

        // Trả về URL của file vừa upload lên S3
        return amazonS3.getUrl(bucketName, fileName).toString();
    }

    public S3Object downloadFile(String fileName) {
        // Tải file từ S3
        return amazonS3.getObject(bucketName, fileName);
    }
}
