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
    this.meetingId = null
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
  initialize(userId, meetingId) {
    this.userId = userId
    this.meetingId = meetingId

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080/ws"
    const socket = new SockJS(socketUrl)

    // Create and configure STOMP client
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

    // Connect to the STOMP broker
    this.stompClient.onConnect = (frame) => {
      console.log("Connected to STOMP broker:", frame)

      // Join the meeting
      this.stompClient.publish({
        destination: "/app/meeting.join",
        body: JSON.stringify({ userId, meetingId })
      })

      // Subscribe to meeting events
      this.setupSubscriptions(userId, meetingId)
    }

    // Handle connection errors
    this.stompClient.onStompError = (frame) => {
      console.error("STOMP error:", frame)
      if (this.callbacks.onError) {
        this.callbacks.onError({ message: "Connection error", details: frame })
      }
    }

    // Handle disconnection
    this.stompClient.onDisconnect = () => {
      console.log("Disconnected from STOMP broker")
    }

    // Start the connection
    this.stompClient.activate()
  }

  // Set up STOMP subscriptions
  setupSubscriptions(userId, meetingId) {
    // Subscribe to user joined events
    this.stompClient.subscribe(`/topic/meeting.${meetingId}.user.joined`, async (message) => {
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
              meetingId,
              payload: JSON.stringify(offer)
            })
          })
        }
      }
    })

    // Subscribe to user left events
    this.stompClient.subscribe(`/topic/meeting.${meetingId}.user.left`, (message) => {
      const data = JSON.parse(message.body)
      console.log("User left:", data.userId)

      this.closePeerConnection(data.userId)
      if (this.callbacks.onParticipantLeft) {
        this.callbacks.onParticipantLeft(data)
      }
    })

    // Subscribe to WebRTC signaling
    this.stompClient.subscribe(`/user/${userId}/topic/meeting.${meetingId}.signal`, async (message) => {
      const data = JSON.parse(message.body)
      
      if (data.type === "offer" && data.from !== userId) {
        console.log("Received offer from:", data.from)
        if (!this.peerConnections[data.from]) {
          await this.createPeerConnection(data.from)
        }

        const offer = JSON.parse(data.payload)
        await this.peerConnections[data.from].setRemoteDescription(new RTCSessionDescription(offer))

        const answer = await this.createAnswer(data.from)
        this.stompClient.publish({
          destination: "/app/meeting.signal",
          body: JSON.stringify({
            type: "answer",
            targetUserId: data.from,
            from: userId,
            meetingId,
            payload: JSON.stringify(answer)
          })
        })
      } else if (data.type === "answer" && data.from !== userId) {
        console.log("Received answer from:", data.from)
        const peerConnection = this.peerConnections[data.from]
        if (peerConnection) {
          const answer = JSON.parse(data.payload)
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        }
      } else if (data.type === "ice-candidate" && data.from !== userId) {
        console.log("Received ICE candidate from:", data.from)
        const peerConnection = this.peerConnections[data.from]
        if (peerConnection) {
          try {
            const candidate = JSON.parse(data.payload)
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (error) {
            console.error("Error adding ICE candidate:", error)
          }
        }
      }
    })

    // Subscribe to chat messages
    this.stompClient.subscribe(`/topic/meeting.${meetingId}.chat`, (message) => {
      const data = JSON.parse(message.body)
      if (this.callbacks.onMessageReceived && data.senderId !== userId) {
        this.callbacks.onMessageReceived(data)
      }
    })

    // Subscribe to file transfers
    this.stompClient.subscribe(`/topic/meeting.${meetingId}.file`, (message) => {
      const data = JSON.parse(message.body)
      if (this.callbacks.onFileReceived && data.senderId !== userId) {
        this.callbacks.onFileReceived(data)
      }
    })

    // Subscribe to audio/video state changes
    this.stompClient.subscribe(`/topic/meeting.${meetingId}.media.state`, (message) => {
      const data = JSON.parse(message.body)
      if (data.userId !== userId) {
        if (data.mediaType === "audio" && this.callbacks.onParticipantAudioToggle) {
          this.callbacks.onParticipantAudioToggle(data.userId, data.enabled)
        } else if (data.mediaType === "video" && this.callbacks.onParticipantVideoToggle) {
          this.callbacks.onParticipantVideoToggle(data.userId, data.enabled)
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
              meetingId: this.meetingId,
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
  async createAnswer(userId) {
    try {
      const peerConnection = this.peerConnections[userId]
      const answer = await peerConnection.createAnswer()
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
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled
      })

      // Notify other participants
      this.stompClient.publish({
        destination: "/app/meeting.media.state",
        body: JSON.stringify({
          userId: this.userId,
          meetingId: this.meetingId,
          mediaType: "audio",
          enabled: enabled
        })
      })
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled
      })

      // Notify other participants
      this.stompClient.publish({
        destination: "/app/meeting.media.state",
        body: JSON.stringify({
          userId: this.userId,
          meetingId: this.meetingId,
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

  // Send a chat message
  sendMessage(message) {
    this.stompClient.publish({
      destination: "/app/meeting.chat",
      body: JSON.stringify({
        ...message,
        meetingId: this.meetingId
      })
    })
  }

  // Send a file
  sendFile(file, metadata) {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const base64data = e.target.result
      
      this.stompClient.publish({
        destination: "/app/meeting.file",
        body: JSON.stringify({
          senderId: this.userId,
          senderName: metadata.senderName,
          meetingId: this.meetingId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64data,
          timestamp: new Date().toISOString()
        })
      })
    }
    
    reader.readAsDataURL(file)
  }

  // Download received file
  downloadFile(fileData) {
    // Extract actual base64 data from dataURL
    const base64Content = fileData.fileData.split(',')[1]
    const blob = this.base64toBlob(base64Content, fileData.fileType)
    saveAs(blob, fileData.fileName)
  }

  // Convert base64 to Blob
  base64toBlob(base64, contentType) {
    const byteCharacters = atob(base64)
    const byteArrays = []
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)
      
      const byteNumbers = new Array(slice.length)
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }
    
    return new Blob(byteArrays, { type: contentType })
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

    // Stop screen sharing stream
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop())
      this.screenStream = null
    }

    // Notify server that user is leaving
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: "/app/meeting.leave",
        body: JSON.stringify({
          userId: this.userId,
          meetingId: this.meetingId
        })
      })
      
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
