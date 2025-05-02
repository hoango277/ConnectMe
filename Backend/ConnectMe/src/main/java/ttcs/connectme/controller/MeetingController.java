package ttcs.connectme.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ttcs.connectme.dto.request.MeetingRequest;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.MeetingResponse;
import ttcs.connectme.dto.response.MeetingUserResponse;
import ttcs.connectme.service.MeetingService;
import ttcs.connectme.service.MeetingUserService;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MeetingController {

    private final MeetingService meetingService;
    private final MeetingUserService meetingUserService;

    @PostMapping("/meetings")
    public ApiResponse<MeetingResponse> createMeeting(@RequestBody MeetingRequest meetingRequest) {
        return meetingService.createMeeting(meetingRequest);
    }

    @GetMapping("/meetings/code/{meetingCode}")
    public ApiResponse<MeetingResponse> getMeetingByCode(@PathVariable String meetingCode) {
        return meetingService.getMeetingByCode(meetingCode);
    }

    @PostMapping("/meetings/{id}/start")
    public ApiResponse<MeetingResponse> startMeeting(@PathVariable Long id) {
        return meetingService.startMeeting(id);
    }

    @PostMapping("/meetings/{id}/end")
    public ApiResponse<MeetingResponse> endMeeting(@PathVariable Long id) {
        return meetingService.endMeeting(id);
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

        MeetingUserResponse result = meetingUserService.addUser(request, meetingCode, userId);

        return ApiResponse.<MeetingUserResponse>builder()
                .code(200)
                .message("Successfully joined the meeting")
                .result(result)
                .build();
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
