package ttcs.connectme.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;

import java.util.Random;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SendEmailService {
    JavaMailSender javaMailSender;

    public String sendOTP(String to) throws Exception {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        String OTP = generateOTP();

        helper.setTo(to);
        helper.setSubject("[ConnectMe] Mã xác thực");
        helper.setText("Mã xác thực của bạn là: " + OTP);

        javaMailSender.send(message);
        return OTP;
    }

    public void sendReminderEmail(String to, String subject, String body) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);

            javaMailSender.send(message);
            System.out.println("Email đã được gửi đến: " + to);
        } catch (MessagingException e) {
            throw new AppException(ErrorCode.SEND_REMINDER_ERROR);
        }
    }

    private String generateOTP() {
        Random random = new Random();
        return String.format ("%06d", random.nextInt(1000000));
    }
}
