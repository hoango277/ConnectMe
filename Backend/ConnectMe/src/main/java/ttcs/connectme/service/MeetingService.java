package ttcs.connectme.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ttcs.connectme.dto.request.MeetingRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.MeetingResponse;
import ttcs.connectme.entity.MeetingEntity;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.MeetingStatus;
import ttcs.connectme.exception.ResourceNotFoundException;
import ttcs.connectme.mapper.MeetingMapper;
import ttcs.connectme.repository.MeetingRepository;
import ttcs.connectme.repository.UserRepository;
import ttcs.connectme.util.MeetingCodeGenerator;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final MeetingMapper meetingMapper;
    private final MeetingCodeGenerator codeGenerator;

    public ApiResponse<MeetingResponse> createMeeting(MeetingRequest request) {
        UserEntity host = userRepository.findById(request.getHostId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getHostId()));

        String meetingCode = generateUniqueMeetingCode();

        MeetingEntity meeting = new MeetingEntity();
        meeting.setTitle(request.getTitle());
        meeting.setDescription(request.getDescription());
        meeting.setMeetingCode(meetingCode);
        meeting.setPassword(request.getPassword());
        meeting.setHost(host);
        meeting.setActualStart(
                request.getActualStart() != null ? request.getActualStart() : LocalDateTime.now()
        );
        meeting.setActualEnd(meeting.getActualStart().plusMinutes(30));
        meeting.setMeetingStatus(MeetingStatus.SCHEDULED);
        meeting.setCurrentParticipants(0);
        meeting.setTotalParticipants(0);
        meeting.setChatMessageCount(0);

        MeetingEntity savedMeeting = meetingRepository.save(meeting);



        MeetingResponse response = meetingMapper.toResponse(savedMeeting);
        response.setHostId(request.getHostId());

        return ApiResponse.<MeetingResponse>builder()
                .result(response)
                .build();
    }

    private MeetingEntity findMeetingById(Long id) {
        return meetingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting", "id", id));
    }

    private String generateUniqueMeetingCode() {
        String code;
        boolean isUnique = false;

        do {
            code = codeGenerator.generateMeetingCode();
            isUnique = !meetingRepository.existsByMeetingCode(code);
        } while (!isUnique);

        return code;
    }
}
