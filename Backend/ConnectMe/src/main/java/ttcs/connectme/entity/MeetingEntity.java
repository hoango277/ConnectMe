package ttcs.connectme.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import ttcs.connectme.enums.MeetingStatus;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "meetings")
public class MeetingEntity extends BaseEntity {
    @Id
    @Column(name = "meeting_code", nullable = false, unique = true, length = 10)
    String meetingCode;

    @Column(name = "title", nullable = false, length = 100)
    String title;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "password")
    String password;

    @ManyToOne
    @JoinColumn(name = "host_id", nullable = false)
    UserEntity host;

    @Column(name = "actual_start")
    LocalDateTime actualStart;

    @Column(name = "actual_end")
    LocalDateTime actualEnd;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    MeetingStatus meetingStatus = MeetingStatus.SCHEDULED;

    @Column(name = "current_participants")
    Integer currentParticipants = 0;

    @Column(name = "total_participants")
    Integer totalParticipants = 0;

    @Column(name = "chat_message_count")
    Integer chatMessageCount = 0;
}