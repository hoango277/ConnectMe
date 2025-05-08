package ttcs.connectme.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.EventDateTime;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.response.MeetingResponse;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class GoogleCalendarService {

    private static final String APPLICATION_NAME = "MeetingReminderApp";
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final String TOKENS_DIRECTORY_PATH = "tokens";
    private static final List<String> SCOPES = Collections.singletonList(CalendarScopes.CALENDAR);
    private static final String CREDENTIALS_FILE_PATH = "/credentials.json";
    // Biểu thức chính quy để kiểm tra định dạng email
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

    // Lấy thông tin xác thực từ credentials.json
    private Credential getCredentials(final NetHttpTransport HTTP_TRANSPORT) throws IOException {
        InputStream in = GoogleCalendarService.class.getResourceAsStream(CREDENTIALS_FILE_PATH);
        if (in == null) {
            throw new FileNotFoundException("Không tìm thấy tài nguyên: " + CREDENTIALS_FILE_PATH);
        }
        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, new InputStreamReader(in));

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                HTTP_TRANSPORT, JSON_FACTORY, clientSecrets, SCOPES)
                .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
                .setAccessType("offline")
                .build();
        LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
        return new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");
    }

    // Thêm sự kiện vào Google Calendar
    public String addMeetingToCalendar(MeetingResponse meeting) throws IOException, GeneralSecurityException {
        // Khởi tạo kết nối HTTP
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        Calendar service = new Calendar.Builder(HTTP_TRANSPORT, JSON_FACTORY, getCredentials(HTTP_TRANSPORT))
                .setApplicationName(APPLICATION_NAME)
                .build();

        // Tạo sự kiện với các thông tin cơ bản
        Event event = new Event()
                .setSummary(meeting.getTitle())
                .setLocation(meeting.getMeetingCode()) // Chỉ sử dụng mã cuộc họp làm vị trí
                .setDescription(meeting.getDescription())
                .setVisibility("default"); // Đảm bảo người tham gia có thể xem

        // Thiết lập thời gian bắt đầu
        DateTime startDateTime = new DateTime(meeting.getActualStart().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant().toEpochMilli());
        EventDateTime start = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone("Asia/Ho_Chi_Minh");
        event.setStart(start);

        // Thiết lập thời gian kết thúc
        DateTime endDateTime = new DateTime(meeting.getActualEnd().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant().toEpochMilli());
        EventDateTime end = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone("Asia/Ho_Chi_Minh");
        event.setEnd(end);

        List<String> invitedParticipants = meeting.getInvitedParticipants();
        System.out.println("Danh sách invitedParticipants: " + (invitedParticipants != null ? invitedParticipants : "null"));
        if (invitedParticipants != null && !invitedParticipants.isEmpty()) {
            List<EventAttendee> attendees = invitedParticipants.stream()
                    .filter(email -> email != null && !email.isEmpty() && EMAIL_PATTERN.matcher(email).matches())
                    .map(email -> new EventAttendee().setEmail(email))
                    .collect(Collectors.toList());
            if (!attendees.isEmpty()) {
                event.setAttendees(attendees);
                System.out.println("Đã thêm " + attendees.size() + " người tham gia: " + attendees.stream().map(EventAttendee::getEmail).collect(Collectors.joining(", ")));
            } else {
                System.out.println("Không có email người tham gia hợp lệ sau khi lọc.");
            }
        } else {
            System.out.println("Danh sách người tham gia rỗng hoặc null.");
        }

        // Gửi sự kiện lên Google Calendar
        String calendarId = "primary";
        try {
            event = service.events()
                    .insert(calendarId, event)
                    .setSendNotifications(true) // Rõ ràng bật gửi thông báo
                    .setSendUpdates("all") // Gửi email mời tới tất cả người tham gia
                    .execute();
        } catch (Exception e) {
            System.err.println("Lỗi khi tạo sự kiện: " + e.getMessage());
            throw e;
        }

        // Ghi log để kiểm tra
        System.out.println("Sự kiện được tạo: " + event.getHtmlLink());
        if (event.getAttendees() != null) {
            for (EventAttendee attendee : event.getAttendees()) {
                System.out.println("Người tham gia: " + attendee.getEmail() + ", Trạng thái: " + attendee.getResponseStatus());
            }
        } else {
            System.out.println("Không có người tham gia nào được thêm vào sự kiện.");
        }

        return event.getHtmlLink(); // Trả về liên kết sự kiện
    }
}