package ttcs.connectme.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ForgotPasswordRequest {
    @Email(message = "EMAIL_INVALID")
    String email;

    @NotBlank
    String newPassword;
}
