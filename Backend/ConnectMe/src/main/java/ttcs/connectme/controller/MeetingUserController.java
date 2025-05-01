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
@RequestMapping("/api")
public class MeetingUserController {
    MeetingUserService meetingUserService;

    @PostMapping(value = "/meetings/{meetingCode}/users/{userId}")
    public ApiResponse<MeetingUserResponse> addUser (@RequestBody MeetingUserRequest request, @PathVariable("meetingCode") String meetingCode, @PathVariable("userId") Long userId) {
        return ApiResponse.<MeetingUserResponse>builder()
                .result(meetingUserService.addUser(request, meetingCode, userId))
                .build();
    }

    @PutMapping(value = "/meeting-users/{id}")
    public ApiResponse<MeetingUserResponse> updateById (@RequestBody MeetingUserRequest request, @PathVariable("id") Long id) {
        return ApiResponse.<MeetingUserResponse>builder()
                .result(meetingUserService.updateById(id, request))
                .build();
    }

    @PutMapping(value = "/meetings/{meetingCode}/users/{userId}")
    public ApiResponse<MeetingUserResponse> updateByMeetingIdAndUserId (@RequestBody MeetingUserRequest request, @PathVariable("meetingCode") String meetingCode, @PathVariable("userId") Long userId) {
        return ApiResponse.<MeetingUserResponse>builder()
                .result(meetingUserService.updateByMeetingIdAndUserId(meetingCode, userId, request))
                .build();
    }

    @DeleteMapping(value = "/meetings/{meetingCode}/users/{userId}")
    public void deleteByMeetingIdAndUserId (@PathVariable("meetingCode") String meetingCode, @PathVariable("userId") Long userId) {
        meetingUserService.deleteByMeetingIdAndUserId(meetingCode, userId);
    }

    @GetMapping(value = "/meetings/{meetingCode}/all")
    public ApiResponse<List<MeetingUserResponse>> getAllByMeetingId (@PathVariable("meetingCode") String meetingCode) {
        return ApiResponse.<List<MeetingUserResponse>>builder()
                .result(meetingUserService.getAllByMeetingId(meetingCode))
                .build();
    }
}
