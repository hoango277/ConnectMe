package ttcs.connectme.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCreateRequest {
    @NotBlank
    String username;

    @Email(message = "EMAIL_INVALID")
    String email;

    @NotBlank
    String fullName;

    @Size(min = 8, message = "PASSWORD_INVALID")
    String password;

    String avatar;
}
