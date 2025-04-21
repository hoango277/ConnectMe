package ttcs.connectme.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.antlr.v4.runtime.misc.NotNull;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingRequest {
    private String title;
    private String description;
    private String password;
    @NotNull
    private Long hostId;
    private LocalDateTime actualStart;
}
