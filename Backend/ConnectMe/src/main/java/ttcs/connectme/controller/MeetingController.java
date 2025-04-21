package ttcs.connectme.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ttcs.connectme.dto.request.MeetingRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.MeetingResponse;
import ttcs.connectme.service.MeetingService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping("/meeting")
    public ApiResponse<MeetingResponse> createMeeting(@RequestBody MeetingRequest meetingRequest){
        return meetingService.createMeeting(meetingRequest);
    }

    @GetMapping("/meeting/code/{meetingCode}")
    public ApiResponse<MeetingResponse> getMeetingByCode(@PathVariable String meetingCode){
        return meetingService.getMeetingByCode(meetingCode);
    }

    @PostMapping("/meeting/{id}/start")
    public ApiResponse<MeetingResponse> startMeeting(@PathVariable Long id) {
        return meetingService.startMeeting(id);
    }

    @PostMapping("/meeting/{id}/end")
    public ApiResponse<MeetingResponse> endMeeting(@PathVariable Long id) {
        return meetingService.endMeeting(id);
    }

}
