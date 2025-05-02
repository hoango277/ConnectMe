package ttcs.connectme.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ttcs.connectme.dto.request.MeetingRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.MeetingResponse;
import ttcs.connectme.entity.MeetingEntity;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.enums.MeetingStatus;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.mapper.MeetingMapper;
import ttcs.connectme.repository.MeetingRepository;
import ttcs.connectme.repository.UserRepository;
import ttcs.connectme.utils.MeetingCodeGenerator;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final MeetingMapper meetingMapper;
    private final MeetingCodeGenerator codeGenerator;

    private String generateUniqueMeetingCode() {
        String code;
        boolean isUnique = false;

        do {
            code = codeGenerator.generateMeetingCode();
            isUnique = !meetingRepository.existsByMeetingCodeAndIsDeletedFalse(code);
        } while (!isUnique);

        return code;
    }

    public ApiResponse<MeetingResponse> createMeeting(MeetingRequest request) {
        UserEntity host = userRepository.findById(request.getHostId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String meetingCode = generateUniqueMeetingCode();

        MeetingEntity meeting = new MeetingEntity();
        meeting.setTitle(request.getTitle());
        meeting.setDescription(request.getDescription());
        meeting.setMeetingCode(meetingCode);
        meeting.setPassword(request.getPassword());
        meeting.setHost(host);
        LocalDateTime startTime;
        if (request.getActualStart() != null) {
            startTime = request.getActualStart();
            meeting.setMeetingStatus(MeetingStatus.SCHEDULED);
        } else {
            startTime = LocalDateTime.now();
            meeting.setMeetingStatus(MeetingStatus.ONGOING);
        }
        meeting.setActualStart(startTime);
        meeting.setActualEnd(startTime.plusMinutes(30));
        meeting.setCurrentParticipants(0);
        meeting.setTotalParticipants(0);
        meeting.setChatMessageCount(0);

        MeetingEntity savedMeeting = meetingRepository.save(meeting);

        MeetingResponse response = meetingMapper.toResponse(savedMeeting);
        response.setHostId(request.getHostId());

        return ApiResponse.<MeetingResponse>builder()
                .code(200)
                .message("Success")
                .result(response)
                .build();
    }

    @Transactional(readOnly = true)
    public ApiResponse<MeetingResponse> getMeetingByCode(String meetingCode) {
        MeetingEntity meeting = meetingRepository.findByMeetingCodeAndIsDeletedFalse(meetingCode)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_NOT_FOUND));

        MeetingResponse response = meetingMapper.toResponse(meeting);
        response.setHostId(meeting.getHost().getId());
        return ApiResponse.<MeetingResponse>builder()
                .code(200)
                .message("Success")
                .result(response)
                .build();
    }

    public ApiResponse<MeetingResponse> startMeeting(Long id) {
        MeetingEntity meeting = meetingRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_NOT_FOUND));

        if (meeting.getMeetingStatus() != MeetingStatus.SCHEDULED) {
            return ApiResponse.<MeetingResponse>builder()
                    .code(400)
                    .message("Only scheduled meetings can be started")
                    .build();
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime scheduledStart = meeting.getActualStart();

        if (scheduledStart.isAfter(now)) {
            meeting.setActualStart(now);
            meeting.setActualEnd(now.plusMinutes(30));
        }
        meeting.setMeetingStatus(MeetingStatus.ONGOING);
        MeetingEntity updatedMeeting = meetingRepository.save(meeting);
        MeetingResponse response = meetingMapper.toResponse(updatedMeeting);
        response.setHostId(meeting.getHost().getId());

        return ApiResponse.<MeetingResponse>builder()
                .code(200)
                .message("Meeting started successfully")
                .result(response)
                .build();
    }

    public ApiResponse<MeetingResponse> endMeeting(Long id) {
        MeetingEntity meeting = meetingRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_NOT_FOUND));

        if (meeting.getMeetingStatus() != MeetingStatus.ONGOING) {
            return ApiResponse.<MeetingResponse>builder()
                    .code(400)
                    .message("Only ongoing meetings can be ended")
                    .build();
        }

        meeting.setMeetingStatus(MeetingStatus.ENDED);
        meeting.setActualEnd(LocalDateTime.now());
        meeting.setCurrentParticipants(0);

        MeetingEntity updatedMeeting = meetingRepository.save(meeting);
        MeetingResponse response = meetingMapper.toResponse(updatedMeeting);
        response.setHostId(meeting.getHost().getId());

        return ApiResponse.<MeetingResponse>builder()
                .code(200)
                .message("Meeting ended successfully")
                .result(response)
                .build();
    }

    public List<ApiResponse<MeetingResponse>> getAllMeetingByUserId(Long userId) {
        UserEntity host = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        List<MeetingEntity> meetings = meetingRepository.findByHostIdAndIsDeletedFalse(userId);
        return meetings.stream().map(meeting -> {
            MeetingResponse response = meetingMapper.toResponse(meeting);
            response.setHostId(host.getId());
            return ApiResponse.<MeetingResponse>builder()
                    .code(200)
                    .message("Success")
                    .result(response)
                    .build();
        }).toList();
    }
}
