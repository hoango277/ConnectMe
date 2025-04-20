package ttcs.connectme.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Entity
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "meeting_settings")
public class MeetingSettingEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @OneToOne
    @JoinColumn(name = "meeting_id", nullable = false, unique = true)
    MeetingEntity meeting;

    @Column(name = "allow_chat")
    Boolean allowChat = true;

    @Column(name = "allow_screen_share")
    Boolean allowScreenShare = true;

    @Column(name = "mute_participants_on_join")
    Boolean muteParticipantsOnJoin = false;

    @Column(name = "disable_camera_on_join")
    Boolean disableCameraOnJoin = false;

    @Column(name = "allow_recording")
    Boolean allowRecording = false;

    @Column(name = "waiting_room_enabled")
    Boolean waitingRoomEnabled = false;

    @Column(name = "only_authenticated_users")
    Boolean onlyAuthenticatedUsers = false;
}