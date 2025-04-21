package ttcs.connectme.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)

public class UserCreateRequest {
    String username;
    String email;
    String fullName;
    String password;
    String avatar;
}
