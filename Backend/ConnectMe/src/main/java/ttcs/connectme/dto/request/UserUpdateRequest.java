package ttcs.connectme.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserUpdateRequest {
    @NotBlank
    String username;

    @Email(message = "EMAIL_INVALID")
    String email;

    @NotBlank
    String fullName;

    String avatar;
}
