package ttcs.connectme.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.antlr.v4.runtime.misc.NotNull;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MeetingRequest {
    String title;
    String description;
    String password;
    @NotNull
    Long hostId;
    LocalDateTime actualStart;
    @JsonProperty("invitedParticipants")
    List<String> invitedParticipants;
}
