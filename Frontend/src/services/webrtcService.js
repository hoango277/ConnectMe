import { io } from "socket.io-client"

class WebRTCService {
  constructor() {
    this.socket = null
    this.peerConnections = {}
    this.localStream = null
    this.onParticipantJoinedCallback = null
    this.onParticipantLeftCallback = null
    this.onRemoteStreamAddedCallback = null
    this.onRemoteStreamRemovedCallback = null
    this.onMessageReceivedCallback = null
    this.onErrorCallback = null
  }

  // Initialize WebRTC service
  initialize(userId, meetingId) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080"

    this.socket = io(socketUrl, {
      auth: {
        token: localStorage.getItem("token"),
      },
      query: {
        meetingId,
      },
    })

    this.setupSocketListeners(userId, meetingId)
  }

  // Set up socket event listeners
  setupSocketListeners(userId, meetingId) {
    this.socket.on("connect", () => {
      console.log("Connected to signaling server")
      this.socket.emit("join-meeting", { userId, meetingId })
    })

    this.socket.on("user-joined", async (data) => {
      console.log("User joined:", data.userId)
      if (this.onParticipantJoinedCallback) {
        this.onParticipantJoinedCallback(data)
      }

      await this.createPeerConnection(data.userId)

      if (this.localStream) {
        const offer = await this.createOffer(data.userId)
        this.socket.emit("offer", {
          targetUserId: data.userId,
          offer,
          from: userId,
        })
      }
    })

    this.socket.on("user-left", (data) => {
      console.log("User left:", data.userId)
      this.closePeerConnection(data.userId)
      if (this.onParticipantLeftCallback) {
        this.onParticipantLeftCallback(data)
      }
    })

    this.socket.on("offer", async (data) => {
      console.log("Received offer from:", data.from)
      if (!this.peerConnections[data.from]) {
        await this.createPeerConnection(data.from)
      }

      await this.peerConnections[data.from].setRemoteDescription(new RTCSessionDescription(data.offer))

      const answer = await this.createAnswer(data.from)
      this.socket.emit("answer", {
        targetUserId: data.from,
        answer,
        from: userId,
      })
    })

    this.socket.on("answer", async (data) => {
      console.log("Received answer from:", data.from)
      const peerConnection = this.peerConnections[data.from]
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    })

    this.socket.on("ice-candidate", async (data) => {
      console.log("Received ICE candidate from:", data.from)
      const peerConnection = this.peerConnections[data.from]
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (error) {
          console.error("Error adding ICE candidate:", error)
        }
      }
    })

    this.socket.on("chat-message", (data) => {
      if (this.onMessageReceivedCallback) {
        this.onMessageReceivedCallback(data)
      }
    })

    this.socket.on("error", (error) => {
      console.error("Socket error:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
    })

    this.socket.on("disconnect", () => {
      console.log("Disconnected from signaling server")
    })
  }

  // Create a new peer connection for a user
  async createPeerConnection(userId) {
    try {
      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
      }

      const peerConnection = new RTCPeerConnection(configuration)

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit("ice-candidate", {
            targetUserId: userId,
            candidate: event.candidate,
            from: this.socket.id,
          })
        }
      }

      peerConnection.ontrack = (event) => {
        if (this.onRemoteStreamAddedCallback) {
          this.onRemoteStreamAddedCallback(userId, event.streams[0])
        }
      }

      peerConnection.onconnectionstatechange = (event) => {
        if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
          this.closePeerConnection(userId)
        }
      }

      // Add local tracks to the peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, this.localStream)
        })
      }

      this.peerConnections[userId] = peerConnection
      return peerConnection
    } catch (error) {
      console.error("Error creating peer connection:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      throw error
    }
  }

  // Create an offer for a peer connection
  async createOffer(userId) {
    try {
      const peerConnection = this.peerConnections[userId]
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error("Error creating offer:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      throw error
    }
  }

  // Create an answer for a peer connection
  async createAnswer(userId) {
    try {
      const peerConnection = this.peerConnections[userId]
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error("Error creating answer:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      throw error
    }
  }

  // Close a peer connection
  closePeerConnection(userId) {
    const peerConnection = this.peerConnections[userId]
    if (peerConnection) {
      peerConnection.close()
      delete this.peerConnections[userId]
    }
  }

  // Get user media (camera and microphone)
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      return this.localStream
    } catch (error) {
      console.error("Error getting user media:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      throw error
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  // Share screen
  async shareScreen() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })

      // Replace video track with screen track
      if (this.localStream) {
        const videoTrack = screenStream.getVideoTracks()[0]

        // Replace video track in all peer connections
        Object.values(this.peerConnections).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        })

        // Handle when user stops screen sharing
        videoTrack.onended = () => {
          this.stopScreenSharing()
        }

        return screenStream
      }
    } catch (error) {
      console.error("Error sharing screen:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      throw error
    }
  }

  // Stop screen sharing
  async stopScreenSharing() {
    try {
      // Get a new video stream from camera
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = newStream.getVideoTracks()[0]

      // Replace screen track with camera track in all peer connections
      Object.values(this.peerConnections).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })

      // Update local stream
      if (this.localStream) {
        const audioTracks = this.localStream.getAudioTracks()
        this.localStream.getVideoTracks().forEach((track) => track.stop())

        this.localStream = new MediaStream([...audioTracks, videoTrack])
      }
    } catch (error) {
      console.error("Error stopping screen sharing:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
    }
  }

  // Send a chat message
  sendMessage(message) {
    this.socket.emit("chat-message", message)
  }

  // Leave the meeting
  leaveMeeting() {
    // Close all peer connections
    Object.keys(this.peerConnections).forEach((userId) => {
      this.closePeerConnection(userId)
    })

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    // Disconnect from socket
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Set callbacks
  setCallbacks({
    onParticipantJoined,
    onParticipantLeft,
    onRemoteStreamAdded,
    onRemoteStreamRemoved,
    onMessageReceived,
    onError,
  }) {
    this.onParticipantJoinedCallback = onParticipantJoined
    this.onParticipantLeftCallback = onParticipantLeft
    this.onRemoteStreamAddedCallback = onRemoteStreamAdded
    this.onRemoteStreamRemovedCallback = onRemoteStreamRemoved
    this.onMessageReceivedCallback = onMessageReceived
    this.onErrorCallback = onError
  }
}

export const webrtcService = new WebRTCService()
