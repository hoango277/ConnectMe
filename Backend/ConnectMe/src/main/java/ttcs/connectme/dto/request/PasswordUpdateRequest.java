package ttcs.connectme.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PasswordUpdateRequest {
    String currentPassword;

    @Size(min = 8, message = "PASSWORD_INVALID")
    String newPassword;
}
