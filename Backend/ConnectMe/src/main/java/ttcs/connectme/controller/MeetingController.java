package ttcs.connectme.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeetingController {
    @GetMapping("/meeting")
    public String meeting() {
        return "meeting";
    }
}
