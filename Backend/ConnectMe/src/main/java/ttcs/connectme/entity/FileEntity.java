package ttcs.connectme.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "files")
public class FileEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne
    @JoinColumn(name = "meeting_id", nullable = false)
    MeetingEntity meeting;

    @ManyToOne
    @JoinColumn(name = "uploader_id", nullable = false)
    UserEntity uploader;

    @Column(name = "file_name", nullable = false)
    String fileName;

    @Column(name = "file_path", nullable = false)
    String filePath;

    @Column(name = "file_size", nullable = false)
    Long fileSize;

    @Column(name = "content_type", nullable = false)
    String contentType;

    @Column(name = "uploaded_at")
    LocalDateTime uploadedAt;
}