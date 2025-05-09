package ttcs.connectme.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import ttcs.connectme.enums.InvitationStatus;
import ttcs.connectme.enums.Role;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "meeting_user")
public class MeetingUserEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne
    @JoinColumn(name = "meeting_code", nullable = false)
    MeetingEntity meeting;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    UserEntity user;

    @Column(name = "role", nullable = false)
    @Enumerated(EnumType.STRING)
    Role role;

    @Column(name = "join_time")
    LocalDateTime joinTime;

    @Column(name = "leave_time")
    LocalDateTime leaveTime;

    @Column(name = "invitation_status")
    @Enumerated(EnumType.STRING)
    InvitationStatus invitationStatus = InvitationStatus.PENDING;

    @Column(name = "is_online")
    Boolean isOnline = true;

    @Column(name = "is_muted")
    Boolean isMuted = false;

    @Column(name = "is_camera_on")
    Boolean isCameraOn = true;

    @Column(name = "is_screen_sharing")
    Boolean isScreenSharing = false;

    @Column(name = "is_speaking")
    Boolean isSpeaking = false;

    @Column(name = "last_heartbeat")
    LocalDateTime lastHeartbeat;
}