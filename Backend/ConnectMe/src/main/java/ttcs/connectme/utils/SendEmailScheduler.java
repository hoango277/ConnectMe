package ttcs.connectme.utils;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.Hibernate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ttcs.connectme.entity.MeetingEntity;
import ttcs.connectme.repository.MeetingRepository;
import ttcs.connectme.service.SendEmailService;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import static lombok.AccessLevel.PRIVATE;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = PRIVATE, makeFinal = true)
public class SendEmailScheduler {

    MeetingRepository meetingRepository;
    SendEmailService emailService;

    @Transactional
    @Scheduled(cron = "0 * * * * ?") // Chạy mỗi phút
    public void sendReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reminderTimeStart = now.plusMinutes(30);
        LocalDateTime reminderTimeEnd = now.plusMinutes(31); // khoảng 1 phút

        List<MeetingEntity> upcomingMeetings = meetingRepository
                .findByActualStartBetweenAndIsDeletedFalse(reminderTimeStart, reminderTimeEnd);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy 'lúc' HH:mm", new Locale("vi", "VN"));

        for (MeetingEntity meeting : upcomingMeetings) {
            String formattedTime = meeting.getActualStart().format(formatter);
            String subject = "📅 Sắp đến giờ họp: " + meeting.getTitle();
            String body = "<p>🔔 Cuộc họp <b>" + meeting.getTitle() + "</b> sẽ bắt đầu sau 30 phút!</p>" +
                    "<p>🕒 <b>Thời gian:</b> " + formattedTime + "</p>" +
                    "<p>📄 <b>Mô tả:</b> " + (meeting.getDescription() != null ? meeting.getDescription() : "Không có mô tả") + "</p>" +
                    "<p>🔐 <b>Mã cuộc họp:</b> " + meeting.getMeetingCode() + "</p>" +
                    "<hr>" +
                    "<p>Vui lòng chuẩn bị và tham gia đúng giờ nhé!</p>" +
                    "<p>— <b>ConnectMe</b> Team</p>";

            Hibernate.initialize(meeting.getInvitedParticipants());
            for (String participantEmail : meeting.getInvitedParticipants()) {
                emailService.sendReminderEmail(participantEmail, subject, body);
            }
        }
    }
}

