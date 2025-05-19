package ttcs.connectme.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LoginResponse {
    String token;
    UserInfo user;

    @Getter
    @Setter
    public static class UserInfo {
        Long id;
        String name;
        String email;
        String avatar;
    }
}
