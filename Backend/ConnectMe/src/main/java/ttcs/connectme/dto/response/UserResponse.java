package ttcs.connectme.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)

public class UserResponse {
    Long id;
    String username;
    String email;
    String fullName;
    String avatar;
    Boolean isActive;
}
