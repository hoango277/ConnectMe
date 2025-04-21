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
@Table(name = "chat_messages")
public class ChatMessageEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne
    @JoinColumn(name = "meeting_id", nullable = false)
    MeetingEntity meeting;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    UserEntity sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    String content;

    @Column(name = "sent_at")
    LocalDateTime sentAt;
}

