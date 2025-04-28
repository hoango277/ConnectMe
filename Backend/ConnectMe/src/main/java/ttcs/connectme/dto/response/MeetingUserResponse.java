package ttcs.connectme.dto.response;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import ttcs.connectme.entity.MeetingEntity;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.InvitationStatus;
import ttcs.connectme.enums.Role;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MeetingUserResponse {
    Long id;

    MeetingEntity meeting;

    UserEntity user;

    Role role;

    LocalDateTime joinTime;

    LocalDateTime leaveTime;

    InvitationStatus invitationStatus;

    Boolean isOnline;

    Boolean isMuted;

    Boolean isCameraOn;

    Boolean isScreenSharing;

    Boolean isSpeaking;

    LocalDateTime lastHeartbeat;
}
