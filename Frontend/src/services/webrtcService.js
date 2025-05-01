import SockJS from "sockjs-client"
import { Client } from "@stomp/stompjs"
import { saveAs } from "file-saver"

class WebRTCService {
  constructor() {
    this.stompClient = null
    this.peerConnections = {}
    this.localStream = null
    this.screenStream = null
    this.userId = null
    this.meetingCode = null
    this.callbacks = {
      onParticipantJoined: null,
      onParticipantLeft: null,
      onRemoteStreamAdded: null,
      onMessageReceived: null,
      onFileReceived: null,
      onError: null,
      onParticipantAudioToggle: null,
      onParticipantVideoToggle: null,
    }
  }

  // Initialize WebRTC service with SockJS and STOMP
  initialize(userId, meetingCode) {
    this.userId = userId
    this.meetingCode = meetingCode

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080/ws"
    const socket = new SockJS(socketUrl, null, {
      transports: ["websocket", "xhr-streaming", "xhr-polling"],
      transportOptions: {
        websocket:    { withCredentials: true },
        xhrStreaming: { withCredentials: true },
        xhrPolling:   { withCredentials: true }
      }
    })

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.debug(str)
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    })

    this.stompClient.onConnect = (frame) => {
      console.log("Connected to STOMP broker:", frame)
      this.setupSubscriptions(userId, meetingCode)
    }

    this.stompClient.onStompError = (frame) => {
      console.error("STOMP error:", frame)
      if (this.callbacks.onError) {
        this.callbacks.onError({ message: "Connection error", details: frame })
      }
    }

    this.stompClient.onDisconnect = () => {
      console.log("Disconnected from STOMP broker")
    }

    this.stompClient.activate()
  }

  // Set up STOMP subscriptions
  setupSubscriptions(userId, meetingCode) {
    // Subscribe to user joined events
    this.stompClient.subscribe(`/topic/meeting.${meetingCode}.user.joined`, async (message) => {
      const data = JSON.parse(message.body)
      console.log("User joined:", data.userId)

      if (data.userId !== userId && this.callbacks.onParticipantJoined) {
        this.callbacks.onParticipantJoined(data)
      }

      if (data.userId !== userId) {
        await this.createPeerConnection(data.userId)

        if (this.localStream) {
          const offer = await this.createOffer(data.userId)
          this.stompClient.publish({
            destination: "/app/meeting.signal",
            body: JSON.stringify({
              type: "offer",
              targetUserId: data.userId,
              from: userId,
              meetingCode: meetingCode,
              payload: JSON.stringify(offer)
            })
          })
        }
      }
    })

    // Subscribe to user left events
    this.stompClient.subscribe(`/topic/meeting.${meetingCode}.user.left`, (message) => {
      const data = JSON.parse(message.body)
      console.log("User left:", data.userId)

      this.closePeerConnection(data.userId)
      if (this.callbacks.onParticipantLeft) {
        this.callbacks.onParticipantLeft(data)
      }
    })

    // Subscribe to signaling messages
    this.stompClient.subscribe(`/user/${userId}/topic/meeting.${meetingCode}.signal`, async (message) => {
      const data = JSON.parse(message.body)
      console.log("Received signal:", data.type)

      if (data.type === "offer") {
        const offer = JSON.parse(data.payload)
        const answer = await this.createAnswer(data.from, offer)
        this.stompClient.publish({
          destination: "/app/meeting.signal",
          body: JSON.stringify({
            type: "answer",
            targetUserId: data.from,
            from: userId,
            meetingCode: meetingCode,
            payload: JSON.stringify(answer)
          })
        })
      } else if (data.type === "answer") {
        const answer = JSON.parse(data.payload)
        await this.handleAnswer(data.from, answer)
      } else if (data.type === "candidate") {
        const candidate = JSON.parse(data.payload)
        await this.addIceCandidate(data.from, candidate)
      }
    })

    // Subscribe to chat messages
    this.stompClient.subscribe(`/topic/meeting.${meetingCode}.chat`, (message) => {
      const data = JSON.parse(message.body)
      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(data)
      }
    })

    // Subscribe to file transfers
    this.stompClient.subscribe(`/topic/meeting.${meetingCode}.file`, (message) => {
      const data = JSON.parse(message.body)
      if (this.callbacks.onFileReceived) {
        this.callbacks.onFileReceived(data)
      }
    })

    // Subscribe to media state updates
    this.stompClient.subscribe(`/topic/meeting.${meetingCode}.media.state`, (message) => {
      const data = JSON.parse(message.body)
      if (data.userId !== userId) {
        if (data.type === "audio") {
          if (this.callbacks.onParticipantAudioToggle) {
            this.callbacks.onParticipantAudioToggle(data.userId, data.enabled)
          }
        } else if (data.type === "video") {
          if (this.callbacks.onParticipantVideoToggle) {
            this.callbacks.onParticipantVideoToggle(data.userId, data.enabled)
          }
        }
      }
    })
  }

  // Create a new peer connection for a user
  async createPeerConnection(userId) {
    try {
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, 
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ],
      }

      const peerConnection = new RTCPeerConnection(configuration)

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.stompClient.publish({
            destination: "/app/meeting.signal",
            body: JSON.stringify({
              type: "ice-candidate",
              targetUserId: userId,
              from: this.userId,
              meetingCode: this.meetingCode,
              payload: JSON.stringify(event.candidate)
            })
          })
        }
      }

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        if (this.callbacks.onRemoteStreamAdded) {
          this.callbacks.onRemoteStreamAdded(userId, event.streams[0])
        }
      }

      // Monitor connection state changes
      peerConnection.onconnectionstatechange = (event) => {
        if (peerConnection.connectionState === "disconnected" || 
            peerConnection.connectionState === "failed") {
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
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
      throw error
    }
  }

  // Create an offer for a peer connection
  async createOffer(userId) {
    try {
      const peerConnection = this.peerConnections[userId]
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      await peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error("Error creating offer:", error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
      throw error
    }
  }

  // Create an answer for a peer connection
  async createAnswer(userId, offer) {
    try {
      const peerConnection = this.peerConnections[userId]
      const answer = await peerConnection.createAnswer(offer)
      await peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error("Error creating answer:", error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
      throw error
    }
  }

  // Handle an answer for a peer connection
  async handleAnswer(userId, answer) {
    try {
      const peerConnection = this.peerConnections[userId]
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      }
    } catch (error) {
      console.error("Error handling answer:", error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
    }
  }

  // Add an ICE candidate to a peer connection
  async addIceCandidate(userId, candidate) {
    try {
      const peerConnection = this.peerConnections[userId]
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
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
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
      throw error
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })

      // Notify other participants
      this.stompClient.publish({
        destination: "/app/meeting.media.state",
        body: JSON.stringify({
          userId: this.userId,
          meetingCode: this.meetingCode,
          mediaType: "audio",
          enabled: enabled
        })
      })
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled
      })

      // Notify other participants
      this.stompClient.publish({
        destination: "/app/meeting.media.state",
        body: JSON.stringify({
          userId: this.userId,
          meetingCode: this.meetingCode,
          mediaType: "video",
          enabled: enabled
        })
      })
    }
  }

  // Share screen
  async shareScreen() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      })

      // Replace video track with screen track
      if (this.localStream) {
        const videoTrack = this.screenStream.getVideoTracks()[0]

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

        return this.screenStream
      }
    } catch (error) {
      console.error("Error sharing screen:", error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
      throw error
    }
  }

  // Stop screen sharing
  async stopScreenSharing() {
    try {
      // Stop all tracks in the screen stream
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop())
        this.screenStream = null
      }

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
        const oldVideoTracks = this.localStream.getVideoTracks()
        
        // Stop old video tracks
        oldVideoTracks.forEach(track => track.stop())
        
        // Create a new stream with audio and new video
        this.localStream = new MediaStream([...audioTracks, videoTrack])
      }
    } catch (error) {
      console.error("Error stopping screen sharing:", error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
    }
  }

  // Send chat message
  sendMessage(message) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: "/app/meeting.chat",
        body: JSON.stringify({
          ...message,
          meetingCode: this.meetingCode
        })
      })
    }
  }

  // Send file
  sendFile(fileData) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: "/app/meeting.file",
        body: JSON.stringify({
          ...fileData,
          meetingCode: this.meetingCode
        })
      })
    }
  }

  // Update media state
  updateMediaState(type, enabled) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: "/app/meeting.media.state",
        body: JSON.stringify({
          userId: this.userId,
          meetingCode: this.meetingCode,
          type: type,
          enabled: enabled
        })
      })
    }
  }

  // Leave the meeting
  leaveMeeting() {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: "/app/meeting.leave",
        body: JSON.stringify({
          userId: this.userId,
          meetingCode: this.meetingCode
        })
      })
      
      // Close all peer connections
      Object.keys(this.peerConnections).forEach(userId => {
        this.closePeerConnection(userId)
      })

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop())
        this.localStream = null
      }

      // Stop screen sharing stream
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop())
        this.screenStream = null
      }

      // Disconnect STOMP client
      this.stompClient.deactivate()
      this.stompClient = null
    }
  }

  // Set callbacks
  setCallbacks(callbacks) {
    this.callbacks = {
      ...this.callbacks,
      ...callbacks
    }
  }
}

export const webrtcService = new WebRTCService()
