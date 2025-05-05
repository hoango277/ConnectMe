package ttcs.connectme.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UploadService {
    Cloudinary cloudinary;

    public String uploadFile(MultipartFile file) throws Exception {
        Map upload = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap());
        return upload.get("url").toString();
    }
}
