package ttcs.connectme.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;
import ttcs.connectme.enums.InvitationStatus;
import ttcs.connectme.enums.Role;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MeetingUserRequest {
    Role role;

    InvitationStatus invitationStatus;

    Boolean isOnline;

    Boolean isMuted;

    Boolean isCameraOn;

    Boolean isScreenSharing;

    Boolean isSpeaking;

    LocalDateTime lastHeartbeat;
}
