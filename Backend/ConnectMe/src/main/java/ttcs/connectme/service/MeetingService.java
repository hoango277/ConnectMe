package ttcs.connectme.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MeetingService {

    // In-memory store of active meetings and participants
    // In a production environment, consider using a database or Redis
    private final Map<String, Set<String>> meetingParticipants = new ConcurrentHashMap<>();

    /**
     * Add a participant to a meeting
     */
    public void addParticipant(String meetingId, String userId) {
        meetingParticipants.computeIfAbsent(meetingId, k -> ConcurrentHashMap.newKeySet())
                .add(userId);
    }

    /**
     * Remove a participant from a meeting
     */
    public void removeParticipant(String meetingId, String userId) {
        if (meetingParticipants.containsKey(meetingId)) {
            meetingParticipants.get(meetingId).remove(userId);

            // If meeting is empty, remove it
            if (meetingParticipants.get(meetingId).isEmpty()) {
                meetingParticipants.remove(meetingId);
            }
        }
    }

    /**
     * Get all participants in a meeting
     */
    public Set<String> getParticipants(String meetingId) {
        return meetingParticipants.getOrDefault(meetingId, ConcurrentHashMap.newKeySet());
    }

    /**
     * Check if a meeting exists
     */
    public boolean meetingExists(String meetingId) {
        return meetingParticipants.containsKey(meetingId);
    }
}