package ttcs.connectme.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.MeetingUserResponse;
import ttcs.connectme.service.MeetingUserService;

import java.util.List;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeetingUserController {
    MeetingUserService meetingUserService;

    @PostMapping(value = "/meetings/{meetingId}/users/{userId}")
    public ApiResponse<MeetingUserResponse> addUser (@RequestBody MeetingUserRequest request, @PathVariable("meetingId") String meetingId, @PathVariable("userId") Long userId) {
        return ApiResponse.<MeetingUserResponse>builder()
                .result(meetingUserService.addUser(request, meetingId, userId))
                .build();
    }

    @PutMapping(value = "/meeting-users/{id}")
    public ApiResponse<MeetingUserResponse> updateById (@RequestBody MeetingUserRequest request, @PathVariable("id") Long id) {
        return ApiResponse.<MeetingUserResponse>builder()
                .result(meetingUserService.updateById(id, request))
                .build();
    }

    @PutMapping(value = "/meetings/{meetingId}/users/{userId}")
    public ApiResponse<MeetingUserResponse> updateByMeetingIdAndUserId (@RequestBody MeetingUserRequest request, @PathVariable("meetingId") String meetingId, @PathVariable("userId") Long userId) {
        return ApiResponse.<MeetingUserResponse>builder()
                .result(meetingUserService.updateByMeetingIdAndUserId(meetingId, userId, request))
                .build();
    }

    @DeleteMapping(value = "/meetings/{meetingId}/users/{userId}")
    public void deleteByMeetingIdAndUserId (@PathVariable("meetingId") String meetingId, @PathVariable("userId") Long userId) {
        meetingUserService.deleteByMeetingIdAndUserId(meetingId, userId);
    }

    @GetMapping(value = "/meetings/{meetingId}/all")
    public ApiResponse<List<MeetingUserResponse>> getAllByMeetingId (@PathVariable("meetingId") String meetingId) {
        return ApiResponse.<List<MeetingUserResponse>>builder()
                .result(meetingUserService.getAllByMeetingId(meetingId))
                .build();
    }
}
