package ttcs.connectme.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ttcs.connectme.dto.request.MeetingRequest;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.MeetingResponse;
import ttcs.connectme.dto.response.MeetingUserResponse;
import ttcs.connectme.entity.MeetingEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.repository.MeetingRepository;
import ttcs.connectme.service.MeetingService;
import ttcs.connectme.service.MeetingUserService;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MeetingController {

    private final MeetingService meetingService;
    private final MeetingUserService meetingUserService;
    private final MeetingRepository meetingRepository;

    @PostMapping("/meetings")
    public ApiResponse<MeetingResponse> createMeeting(@RequestBody MeetingRequest meetingRequest) {
        return meetingService.createMeeting(meetingRequest);
    }

    @GetMapping("/meetings/code/{meetingCode}")
    public ApiResponse<MeetingResponse> getMeetingByCode(@PathVariable String meetingCode) {
        return meetingService.getMeetingByCode(meetingCode);
    }


    @PostMapping("/meetings/code/{meetingCode}/start")
    public ApiResponse<MeetingResponse> startMeetingByCode(@PathVariable String meetingCode) {
        return meetingService.startMeetingByCode(meetingCode);
    }

    @PostMapping("/meetings/code/{meetingCode}/end")
    public ApiResponse<MeetingResponse> endMeetingByCode(@PathVariable String meetingCode) {
        return meetingService.endMeetingByCode(meetingCode);
    }

    @GetMapping("/meetings/user/{userId}")
    public List<ApiResponse<MeetingResponse>> getAllMeetingByUserId(@PathVariable Long userId) {
        return meetingService.getAllMeetingByUserId(userId);
    }

    @PostMapping("/meetings/{meetingCode}/join/{userId}")
    public ApiResponse<MeetingUserResponse> joinMeeting(
            @PathVariable String meetingCode,
            @PathVariable Long userId,
            @RequestBody(required = false) MeetingUserRequest request) {

        try {
            MeetingUserResponse result = meetingUserService.addUser(request, meetingCode, userId);

            return ApiResponse.<MeetingUserResponse>builder()
                    .code(200)
                    .message("Successfully joined the meeting")
                    .result(result)
                    .build();
        } catch (AppException e) {
            return ApiResponse.<MeetingUserResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(e.getMessage())
                    .build();
        } catch (Exception e) {
            return ApiResponse.<MeetingUserResponse>builder()
                    .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatusCode().value())
                    .message("Lỗi khi tham gia cuộc họp: " + e.getMessage())
                    .build();
        }
    }

    @PostMapping("/meetings/{meetingCode}/leave/{userId}")
    public ApiResponse<Void> leaveMeeting(
            @PathVariable String meetingCode,
            @PathVariable Long userId) {

        meetingUserService.deleteByMeetingIdAndUserId(meetingCode, userId);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Successfully left the meeting")
                .build();
    }
}
