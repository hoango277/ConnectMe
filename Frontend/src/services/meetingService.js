import { api } from "./api"

// Mock data for development without backend
const mockMeetings = [
  {
    id: "meeting-1",
    title: "Weekly Team Standup",
    description: "Weekly team standup meeting to discuss progress and blockers",
    scheduledTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    duration: 30,
    meetingCode: "abc-123-xyz",
    hostId: "mock-user-1",
    status: "scheduled",
    participantCount: 5
  },
  {
    id: "meeting-2",
    title: "Project Review",
    description: "Monthly project review with stakeholders",
    scheduledTime: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    duration: 60,
    meetingCode: "def-456-uvw",
    hostId: "mock-user-1",
    status: "scheduled",
    participantCount: 8
  },
  {
    id: "meeting-3",
    title: "Interview: Frontend Developer",
    description: "Interview candidate for the Frontend Developer position",
    scheduledTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    duration: 45,
    meetingCode: "ghi-789-rst",
    hostId: "mock-user-1",
    status: "ended",
    participantCount: 3
  }
];

const mockParticipants = [
  {
    id: "mock-user-1",
    name: "Test User",
    audioEnabled: true,
    videoEnabled: true
  },
  {
    id: "participant-1",
    name: "John Doe",
    audioEnabled: true,
    videoEnabled: true
  },
  {
    id: "participant-2",
    name: "Jane Smith",
    audioEnabled: false,
    videoEnabled: true
  }
];

export const meetingService = {
  // Create a new meeting
  createMeeting: async (meetingData) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock createMeeting in development mode");
        const newMeeting = {
          id: `meeting-${Date.now()}`,
          meetingCode: `meet-${Math.random().toString(36).substring(2, 7)}`,
          hostId: "mock-user-1",
          status: "scheduled",
          participantCount: 1,
          ...meetingData,
        };
        mockMeetings.push(newMeeting);
        return newMeeting;
      }
      
      const response = await api.post("/api/meetings", meetingData)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get meeting details by ID
  getMeeting: async (meetingId) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock getMeeting in development mode");
        const meeting = mockMeetings.find(m => m.id === meetingId);
        if (meeting) return meeting;
        throw new Error("Meeting not found");
      }
      
      const response = await api.get(`/api/meetings/${meetingId}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Join a meeting
  joinMeeting: async (meetingCode) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock joinMeeting in development mode");
        const meeting = mockMeetings.find(m => m.meetingCode === meetingCode);
        if (meeting) return { meetingId: meeting.id, success: true };
        throw new Error("Invalid meeting code");
      }
      
      const response = await api.post(`/api/meetings/join`, { meetingCode })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get user's meetings (scheduled or past)
  getUserMeetings: async (params = {}) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock getUserMeetings in development mode");
        return mockMeetings;
      }
      
      const response = await api.get("/api/meetings/user", { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // End a meeting (host only)
  endMeeting: async (meetingId) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock endMeeting in development mode");
        const meetingIndex = mockMeetings.findIndex(m => m.id === meetingId);
        if (meetingIndex >= 0) {
          mockMeetings[meetingIndex].status = "ended";
          return { success: true };
        }
        throw new Error("Meeting not found");
      }
      
      const response = await api.post(`/api/meetings/${meetingId}/end`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get meeting participants
  getMeetingParticipants: async (meetingId) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock getMeetingParticipants in development mode");
        return mockParticipants;
      }
      
      const response = await api.get(`/api/meetings/${meetingId}/participants`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Update participant permissions (host only)
  updateParticipantPermissions: async (meetingId, participantId, permissions) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock updateParticipantPermissions in development mode");
        const participantIndex = mockParticipants.findIndex(p => p.id === participantId);
        if (participantIndex >= 0) {
          mockParticipants[participantIndex] = {
            ...mockParticipants[participantIndex],
            ...permissions
          };
          return mockParticipants[participantIndex];
        }
        throw new Error("Participant not found");
      }
      
      const response = await api.put(`/api/meetings/${meetingId}/participants/${participantId}`, permissions)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Remove participant from meeting (host only)
  removeParticipant: async (meetingId, participantId) => {
    try {
      // Mock data in development mode
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock removeParticipant in development mode");
        const index = mockParticipants.findIndex(p => p.id === participantId);
        if (index >= 0) {
          mockParticipants.splice(index, 1);
          return { success: true };
        }
        throw new Error("Participant not found");
      }
      
      const response = await api.delete(`/api/meetings/${meetingId}/participants/${participantId}`)
      return response.data
    } catch (error) {
      throw error
    }
  },
}
