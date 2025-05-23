import { api } from "./api"
import { getCurrentUserId } from "../utils/auth"
import { webrtcService } from "./webrtcService"

export const meetingService = {
  // Create a new meeting
  createMeeting: async (meetingData) => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        throw new Error("User not authenticated")
      }

      const requestData = {
        title: meetingData.title,
        description: meetingData.description,
        password: meetingData.password,
        hostId: userId,
        actualStart: meetingData.actualStart,
        invitedParticipants: meetingData.invitedParticipants
      }

      const response = await api.post("/api/meetings", requestData)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get meeting by code
  getMeetingByCode: async (meetingCode) => {
    try {
      const response = await api.get(`/api/meetings/code/${meetingCode}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Start a meeting
  startMeeting: async (meetingCode) => {
    try {
      // Gọi trực tiếp đến API endpoint mới với meetingCode
      const response = await api.post(`/api/meetings/code/${meetingCode}/start`)
      return response.data
    } catch (error) {
      console.error("Error starting meeting:", error)
      throw error
    }
  },

  // End a meeting
  endMeeting: async (meetingCode) => {
    try {
      // Gọi trực tiếp đến API endpoint mới với meetingCode
      const response = await api.post(`/api/meetings/code/${meetingCode}/end`)
      return response.data
    } catch (error) {
      console.error("Error ending meeting:", error)
      throw error
    }
  },

  // Get meeting details by ID
  getMeeting: async (meetingCode) => {
    try {
      // First get the meeting by code to get the ID
      const meetingResponse = await meetingService.getMeetingByCode(meetingCode)
      if (meetingResponse.code !== 200) {
        throw new Error(meetingResponse.message || "Meeting not found")
      }
      return meetingResponse;
    } catch (error) {
      throw error
    }
  },

  // Join a meeting
  joinMeeting: async (meetingCode, displayName) => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        throw new Error("User not authenticated")
      }

      const meetingResponse = await meetingService.getMeetingByCode(meetingCode)
      if (meetingResponse.code !== 200) {
        throw new Error(meetingResponse.message || "Meeting not found")
      }

      const meetingUserRequest = {
        role: "PARTICIPANT",
        invitationStatus: "ACCEPTED",
        isOnline: true,
        isMuted: false,
        isCameraOn: true,
        isScreenSharing: false,
        isSpeaking: false,
        lastHeartbeat: new Date().toISOString()
      }

      try {
        console.log("Sending join request to API:", meetingCode, userId, meetingUserRequest);
        const addUserResponse = await api.post(`/api/meetings/${meetingCode}/join/${userId}`, meetingUserRequest)
        
        if (!addUserResponse.data || addUserResponse.data.code !== 200) {
          const errorMessage = addUserResponse.data?.message || "Failed to join meeting";
          console.error("Join meeting error:", {
            code: addUserResponse.data?.code,
            message: errorMessage,
            meetingCode,
            userId
          });
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error("API error when joining meeting:", error);
        

        const serverMessage = error.response?.data?.message;
        if (serverMessage) {
          throw new Error(serverMessage);
        }
        
        // Nếu không có message từ server, ném lỗi gốc
        throw error;
      }

      // Check if WebRTC is already initialized with the same parameters
      const isAlreadyInitialized = webrtcService.stompClient &&
                                  webrtcService.stompClient.connected &&
                                  webrtcService.userId === userId &&
                                  webrtcService.meetingCode === meetingCode;

      console.log("Joining meeting, WebRTC status:",
                 isAlreadyInitialized ? "already initialized" : "initializing");

      // Initialize WebRTC service with the meeting if not already initialized
      if (!isAlreadyInitialized) {
        await new Promise((resolve, reject) => {
          webrtcService.initialize(userId, meetingCode)

          // Wait for the STOMP client to connect
          const checkConnection = setInterval(() => {
            if (webrtcService.stompClient && webrtcService.stompClient.connected) {
              clearInterval(checkConnection)
              resolve()
            }
          }, 100)

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkConnection)
            reject(new Error("Failed to connect to WebSocket server"))
          }, 5000)
        })
      } else {
        console.log("Reusing existing WebRTC connection");
      }

      // Send join request via WebSocket - this is the ONLY place where join should be sent
      // Check if we're already connected to this meeting to avoid duplicate join messages
      const isAlreadyJoined = webrtcService.userId === userId &&
                             webrtcService.meetingCode === meetingCode &&
                             webrtcService.hasJoinedMeeting;

      if (!isAlreadyJoined) {
        console.log("Sending join message for user", userId, "to meeting", meetingCode);
        webrtcService.stompClient.publish({
          destination: "/app/meeting.join",
          body: JSON.stringify({
            userId: userId,
            meetingCode: meetingCode,
          })
        });

        // Mark that we've joined this meeting to prevent duplicate join messages
        webrtcService.hasJoinedMeeting = true;
      } else {
        console.log("User", userId, "already joined meeting", meetingCode, "- skipping join message");
      }

      return { success: true, meetingCode }
    } catch (error) {
      console.error("Error joining meeting:", error);
      throw error;
    }
  },

  // Leave a meeting
  leaveMeeting: async (meetingCode) => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        throw new Error("User not authenticated")
      }

      // Send leave request via WebSocket
      webrtcService.stompClient.publish({
        destination: "/app/meeting.leave",
        body: JSON.stringify({
          userId: userId,
          meetingCode: meetingCode
        })
      })

      // Clean up WebRTC service
      webrtcService.leaveMeeting()

      return { success: true }
    } catch (error) {
      throw error
    }
  },

  // Get user's meetings (scheduled or past)
  getUserMeetings: async (params = {}) => {
    try {
      // Xác định userId từ thông tin người dùng hiện tại
      const userId = await getCurrentUserId();
      
      if (!userId) {
        throw new Error("User not authenticated");
      }
      
      const response = await api.get(`/api/meetings/user/${userId}`, { params });
      console.log(response)
      
      if (response.data && Array.isArray(response.data)) {
        return response.data.map(item => item.result);
      }
      
      // Fallback cho các trường hợp response không phải mảng
      return response.data || [];
    } catch (error) {
      console.error("Error in getUserMeetings:", error);
      
      // Xử lý lỗi 403 Forbidden
      if (error.response && error.response.status === 403) {
        console.error("Access forbidden. Check your authentication status.");
      }
      
      // Trả về mảng rỗng thay vì throw error để tránh crash UI
      return [];
    }
  },

  // Get meeting participants
  getMeetingParticipants: async (meetingCode) => {
    try {
      const response = await api.get(`/api/meetings/${meetingCode}/all`)
      // Map API result to frontend shape
      if (response.data && Array.isArray(response.data.result)) {
        const mapped = response.data.result.map((p) => {
          // Use the name directly from the participant object if available
          // This is the most reliable source based on the provided data structure
          let participantName = p.name;

          // If name is not available at the top level, try the user object
          if (!participantName && p.user) {
            if (p.user.fullName) participantName = p.user.fullName;
            else if (p.user.username) participantName = p.user.username;
            else if (p.user.email) participantName = p.user.email;
          }

          // Final fallback
          if (!participantName) participantName = "Unknown";

          console.log("Participant mapping:", p.id, "->", participantName);

          // Create a clean participant object with the correct structure
          return {
            id: p.id,
            name: participantName,
            audioEnabled: !p.isMuted,
            videoEnabled: p.isCameraOn,
            role: p.role,
            isOnline: p.isOnline,
            user: p.user
          };
        });
        return mapped;
      }
      return [];
    } catch (error) {
      throw error;
    }
  },

  // Update participant permissions (host only)
  updateParticipantPermissions: async (meetingCode, userId, permissions) => {
    try {
      const response = await api.put(`/api/meetings/${meetingCode}/users/${userId}`, permissions)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Remove participant from meeting (host only)
  removeParticipant: async (meetingCode, userId) => {
    try {
      await api.delete(`/api/meetings/${meetingCode}/users/${userId}`)
      return { success: true }
    } catch (error) {
      throw error
    }
  },

  // User removes themselves from meeting
  removeParticipantSelf: async (meetingCode, userId) => {
    try {
      await api.post(`/api/meetings/${meetingCode}/leave/${userId}`)
      return { success: true }
    } catch (error) {
      console.error("Error removing self from meeting:", error);
      throw error
    }
  }
}
