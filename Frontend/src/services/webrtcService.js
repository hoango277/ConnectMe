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
    this.hasJoinedMeeting = false
    this.pendingCandidates = {}
    this.remoteStreams = {} // Store remote streams by user ID
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

  // Store a remote stream for a user
  storeRemoteStream(userId, stream) {
    console.log(`Storing remote stream for user ${userId} in webrtcService.remoteStreams`);
    this.remoteStreams[userId] = stream;

    // Also store in the global window object for debugging and direct access
    if (typeof window !== 'undefined') {
      if (!window.remoteStreams) {
        window.remoteStreams = {};
      }
      window.remoteStreams[userId] = stream;
    }
  }

  // Initialize WebRTC service with SockJS and STOMP
  initialize(userId, meetingCode) {
    // If already initialized with the same parameters, don't reinitialize
    if (this.stompClient && this.stompClient.connected &&
        this.userId === userId && this.meetingCode === meetingCode) {
      console.log("WebRTC service already initialized with the same parameters")
      return this.stompClient; // Return the existing client for chaining
    }

    // If already initialized but with different parameters, disconnect first
    if (this.stompClient && this.stompClient.connected) {
      console.log("Disconnecting existing STOMP client before reinitializing")
      this.stompClient.deactivate()
    }

    this.userId = userId
    this.meetingCode = meetingCode
    // Only reset join status if we're connecting to a different meeting
    if (this.meetingCode !== meetingCode) {
      this.hasJoinedMeeting = false
    }

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

      // If we didn't intend to disconnect (e.g., due to network issues), try to reconnect
      if (this.hasJoinedMeeting) {
        console.log("Unexpected disconnection. Attempting to reconnect...");
        // Wait a moment before trying to reconnect
        setTimeout(() => {
          if (this.hasJoinedMeeting && (!this.stompClient || !this.stompClient.connected)) {
            console.log("Reconnecting to WebSocket server...");
            this.initialize(this.userId, this.meetingCode);
          }
        }, 2000);
      }
    }

    this.stompClient.activate()
  }

  // Set up STOMP subscriptions
  setupSubscriptions(userId, meetingCode) {
    // Subscribe to user joined events
    this.stompClient.subscribe(`/topic/meeting.${meetingCode}.user.joined`, async (message) => {
      const data = JSON.parse(message.body)
      console.log("User joined:", data.userId, "Current user:", userId)

      if (data.userId !== userId && this.callbacks.onParticipantJoined) {
        this.callbacks.onParticipantJoined(data)
      }

      if (data.userId !== userId) {
        try {
          // Use the reliable method to ensure connection and offer are sent
          await this.ensureConnectionAndSendOffer(data.userId);

          // Set a retry timer to make sure the offer is sent
          // This helps in case the first attempt fails
          setTimeout(() => {
            // Check if we have a remote stream - if not, try again
            if (!this.remoteStreams[data.userId]) {
              console.log(`No remote stream found for user ${data.userId} after initial connection, retrying...`);
              this.ensureConnectionAndSendOffer(data.userId);
            }
          }, 3000);
        } catch (err) {
          console.error("Error handling new participant:", err)
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
      try {
        const data = JSON.parse(message.body)
        console.log("Received signal:", data.type, "from user:", data.from)

        if (data.type === "offer") {
          console.log("Processing offer from user:", data.from)
          const offer = JSON.parse(data.payload)

          // Create an answer in response to the offer
          const answer = await this.createAnswer(data.from, offer)

          console.log("Sending answer to user:", data.from)
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
          console.log("Processing answer from user:", data.from)
          const answer = JSON.parse(data.payload)
          await this.handleAnswer(data.from, answer)
        } else if (data.type === "ice-candidate") {
          console.log("Processing ICE candidate from user:", data.from)
          const candidate = JSON.parse(data.payload)
          await this.addIceCandidate(data.from, candidate)
        } else {
          console.warn("Unknown signal type:", data.type)
        }
      } catch (err) {
        console.error("Error processing signal:", err)
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
      console.log(`Creating peer connection for user ID: ${userId}`);

      // Check if we already have a connection for this user
      if (this.peerConnections[userId]) {
        console.log(`Peer connection already exists for user ${userId}, reusing it`);
        return this.peerConnections[userId];
      }

      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ],
      }

      const peerConnection = new RTCPeerConnection(configuration)
      console.log(`New RTCPeerConnection created for user ${userId}`);

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`ICE candidate generated for user ${userId}:`, event.candidate.candidate.substring(0, 50) + '...');
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
        } else {
          console.log(`ICE candidate gathering complete for user ${userId}`);
        }
      }

      // Log ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state changed for user ${userId}: ${peerConnection.iceConnectionState}`);
      }

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        console.log(`Remote track received from user ${userId}:`,
                    event.track.kind,
                    event.streams ? `(streams: ${event.streams.length})` : '(no streams)');

        // Log detailed information about the track
        console.log(`Track details - kind: ${event.track.kind}, enabled: ${event.track.enabled}, readyState: ${event.track.readyState}, muted: ${event.track.muted}`);

        // Create a new stream if none is provided
        let stream = null;
        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
          console.log(`Using existing stream from event for user ${userId}`);
        } else {
          // If no stream is provided, create a new one with this track
          console.log(`No stream provided in track event for user ${userId}, creating new stream`);
          stream = new MediaStream([event.track]);
        }

        // Add data attributes to the stream for debugging and identification
        stream.userId = userId;

        // Add a custom property to help identify this stream
        Object.defineProperty(stream, 'remoteUserId', {
          value: userId,
          writable: false,
          configurable: true
        });

        console.log(`Remote stream for user ${userId}:`,
                    `audio tracks: ${stream.getAudioTracks().length}`,
                    `video tracks: ${stream.getVideoTracks().length}`);

        // Store the stream in our internal references for direct access
        // This is critical for the MeetingRoom component to find the stream
        this.storeRemoteStream(userId, stream);

        // Store the stream in the global window object for debugging
        if (typeof window !== 'undefined') {
          if (!window.debugStreams) {
            window.debugStreams = {};
          }
          window.debugStreams[userId] = stream;
        }

        if (this.callbacks.onRemoteStreamAdded) {
          // Make sure we pass the correct user ID with the stream
          console.log(`Calling onRemoteStreamAdded callback for user ${userId}`);
          this.callbacks.onRemoteStreamAdded(userId, stream);
        } else {
          console.warn(`No onRemoteStreamAdded callback registered for user ${userId}`);
        }
      }

      // Monitor connection state changes
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "disconnected" ||
            peerConnection.connectionState === "failed") {
          this.closePeerConnection(userId)
        }
      }

      // Add local tracks to the peer connection
      if (this.localStream) {
        console.log(`Adding local tracks to peer connection for user ${userId} - audio tracks: ${this.localStream.getAudioTracks().length}, video tracks: ${this.localStream.getVideoTracks().length}`);

        // Make sure we have tracks to add
        const tracks = this.localStream.getTracks();
        if (tracks.length === 0) {
          console.warn(`No tracks found in local stream for user ${userId}, attempting to get user media`);

          // Try to get user media if no tracks are available
          navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
              console.log(`Got new user media with tracks: audio=${stream.getAudioTracks().length}, video=${stream.getVideoTracks().length}`);
              this.localStream = stream;

              // Add the new tracks to the peer connection
              stream.getTracks().forEach(track => {
                console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
                peerConnection.addTrack(track, stream);
              });
            })
            .catch(err => console.error("Failed to get user media:", err));
        } else {
          // Add existing tracks
          tracks.forEach((track) => {
            console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
            peerConnection.addTrack(track, this.localStream);
          });
        }
      } else {
        console.warn(`No local stream available for user ${userId}, attempting to get user media`);

        // Try to get user media if no local stream is available
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            console.log(`Got new user media with tracks: audio=${stream.getAudioTracks().length}, video=${stream.getVideoTracks().length}`);
            this.localStream = stream;

            // Add the new tracks to the peer connection
            stream.getTracks().forEach(track => {
              console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
              peerConnection.addTrack(track, stream);
            });
          })
          .catch(err => console.error("Failed to get user media:", err));
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
      console.log("Creating answer for user:", userId)

      // Make sure we have a peer connection for this user
      if (!this.peerConnections[userId]) {
        console.log("Creating peer connection for user before answering:", userId)
        await this.createPeerConnection(userId)
      }

      const peerConnection = this.peerConnections[userId]

      // Set the remote description first
      console.log("Setting remote description from offer")
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

        // Process any pending ICE candidates
        await this.processPendingCandidates(userId)

        // Then create the answer
        console.log("Creating answer")
        const answer = await peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        })

        // Set the local description
        console.log("Setting local description from answer")
        await peerConnection.setLocalDescription(answer)

        return answer
      } catch (err) {
        console.error("Error setting remote description or creating answer:", err)

        // If there's an error, recreate the peer connection and try again
        console.log("Recreating peer connection after error")
        this.closePeerConnection(userId)
        await this.createPeerConnection(userId)

        const newPeerConnection = this.peerConnections[userId]

        // Try again with the new peer connection
        console.log("Retrying with new peer connection")
        await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer))

        // Process any pending ICE candidates
        await this.processPendingCandidates(userId)

        // Create the answer
        const answer = await newPeerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        })

        // Set the local description
        await newPeerConnection.setLocalDescription(answer)

        return answer
      }
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
      console.log("Handling answer from user:", userId)

      const peerConnection = this.peerConnections[userId]
      if (peerConnection) {
        console.log("Setting remote description from answer")
        try {
          // Check if the connection is in the right state to receive an answer
          // An answer can only be set if we've already sent an offer (signalingState should be 'have-local-offer')
          if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            console.log("Remote description set successfully")

            // Process any pending ICE candidates
            await this.processPendingCandidates(userId)
          } else {
            console.warn(`Cannot set remote description: peer connection is in ${peerConnection.signalingState} state, expected 'have-local-offer'`)

            // If we're in stable state, it means we might have already processed this answer
            // or we haven't sent an offer yet
            if (peerConnection.signalingState === 'stable') {
              console.log("Connection is already in stable state, ignoring answer")
            } else {
              // For other states, we might need to recreate the connection
              console.log(`Connection is in unexpected state: ${peerConnection.signalingState}, recreating connection`)

              // Close the existing connection
              this.closePeerConnection(userId)

              // Create a new connection
              await this.createPeerConnection(userId)

              // If we have a local stream, create and send a new offer
              if (this.localStream) {
                const offer = await this.createOffer(userId)
                this.stompClient.publish({
                  destination: "/app/meeting.signal",
                  body: JSON.stringify({
                    type: "offer",
                    targetUserId: userId,
                    from: this.userId,
                    meetingCode: this.meetingCode,
                    payload: JSON.stringify(offer)
                  })
                })
              }
            }
          }
        } catch (err) {
          console.error("Error setting remote description:", err)

          // If setting the remote description fails, check the connection state
          if (peerConnection.connectionState === 'failed' ||
              peerConnection.connectionState === 'disconnected' ||
              peerConnection.connectionState === 'closed') {

            console.log(`Connection state is ${peerConnection.connectionState}, recreating peer connection`)

            // Close the existing connection
            this.closePeerConnection(userId)

            // Create a new connection
            await this.createPeerConnection(userId)

            // If we have a local stream, create and send a new offer
            if (this.localStream) {
              const offer = await this.createOffer(userId)
              this.stompClient.publish({
                destination: "/app/meeting.signal",
                body: JSON.stringify({
                  type: "offer",
                  targetUserId: userId,
                  from: this.userId,
                  meetingCode: this.meetingCode,
                  payload: JSON.stringify(offer)
                })
              })
            }
          }
        }
      } else {
        console.warn("No peer connection found for user:", userId)

        // Create a new peer connection if one doesn't exist
        console.log(`Creating new peer connection for user ${userId}`)
        await this.createPeerConnection(userId)

        // If we have a local stream, create and send a new offer
        if (this.localStream) {
          const offer = await this.createOffer(userId)
          this.stompClient.publish({
            destination: "/app/meeting.signal",
            body: JSON.stringify({
              type: "offer",
              targetUserId: userId,
              from: this.userId,
              meetingCode: this.meetingCode,
              payload: JSON.stringify(offer)
            })
          })
        }
      }
    } catch (error) {
      console.error("Error handling answer:", error, "for user:", userId)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
    }
  }

  // Add an ICE candidate to a peer connection
  async addIceCandidate(userId, candidate) {
    try {
      console.log(`Adding ICE candidate for user ${userId}:`, candidate.candidate ? candidate.candidate.substring(0, 50) + '...' : 'null candidate');

      // Create peer connection if it doesn't exist
      if (!this.peerConnections[userId]) {
        console.log(`No peer connection found for user ${userId}, creating one`);
        await this.createPeerConnection(userId);
      }

      const peerConnection = this.peerConnections[userId];

      // Check if the remote description is set before adding ICE candidates
      if (peerConnection.remoteDescription) {
        console.log(`Remote description is set for user ${userId}, adding ICE candidate immediately`);
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`ICE candidate added successfully for user ${userId}`);
        } catch (err) {
          console.error(`Failed to add ICE candidate for user ${userId}:`, err);

          // If adding the candidate fails, check the connection state
          if (peerConnection.connectionState === 'failed' ||
              peerConnection.connectionState === 'disconnected' ||
              peerConnection.connectionState === 'closed') {

            console.log(`Connection state is ${peerConnection.connectionState}, recreating peer connection`);

            // Close the existing connection
            this.closePeerConnection(userId);

            // Create a new connection
            await this.createPeerConnection(userId);

            // Store the candidate for later processing
            if (!this.pendingCandidates) {
              this.pendingCandidates = {};
            }
            if (!this.pendingCandidates[userId]) {
              this.pendingCandidates[userId] = [];
            }
            this.pendingCandidates[userId].push(candidate);

            // If we have a local stream, create and send a new offer
            if (this.localStream) {
              const offer = await this.createOffer(userId);
              this.stompClient.publish({
                destination: "/app/meeting.signal",
                body: JSON.stringify({
                  type: "offer",
                  targetUserId: userId,
                  from: this.userId,
                  meetingCode: this.meetingCode,
                  payload: JSON.stringify(offer)
                })
              });
            }
          }
        }
      } else {
        console.warn(`Cannot add ICE candidate for user ${userId}: remote description not set yet, storing for later`);
        // Store the candidate to add later
        if (!this.pendingCandidates) {
          this.pendingCandidates = {};
        }
        if (!this.pendingCandidates[userId]) {
          this.pendingCandidates[userId] = [];
        }
        this.pendingCandidates[userId].push(candidate);
        console.log(`Stored pending ICE candidate for user ${userId}, total pending: ${this.pendingCandidates[userId].length}`);
      }
    } catch (error) {
      console.error(`Error adding ICE candidate for user ${userId}:`, error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    }
  }

  // Process any pending ICE candidates for a user
  async processPendingCandidates(userId) {
    try {
      if (this.pendingCandidates && this.pendingCandidates[userId] && this.pendingCandidates[userId].length > 0) {
        console.log(`Processing ${this.pendingCandidates[userId].length} pending ICE candidates for user ${userId}`);

        const peerConnection = this.peerConnections[userId];
        if (!peerConnection) {
          console.warn(`Cannot process pending ICE candidates: no peer connection for user ${userId}`);
          return;
        }

        if (!peerConnection.remoteDescription) {
          console.warn(`Cannot process pending ICE candidates: remote description not set for user ${userId}`);
          return;
        }

        console.log(`Remote description is set for user ${userId}, adding ${this.pendingCandidates[userId].length} pending ICE candidates`);

        // Add all pending candidates
        let successCount = 0;
        for (const candidate of this.pendingCandidates[userId]) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            successCount++;
          } catch (err) {
            console.error(`Error adding pending ICE candidate for user ${userId}:`, err);
          }
        }

        console.log(`Successfully added ${successCount}/${this.pendingCandidates[userId].length} pending ICE candidates for user ${userId}`);

        // Clear the pending candidates
        this.pendingCandidates[userId] = [];
      }
    } catch (error) {
      console.error(`Error processing pending candidates for user ${userId}:`, error);
    }
  }

  // Close a peer connection
  closePeerConnection(userId) {
    const peerConnection = this.peerConnections[userId]
    if (peerConnection) {
      peerConnection.close()
      delete this.peerConnections[userId]
    }

    // Clear any pending candidates
    if (this.pendingCandidates && this.pendingCandidates[userId]) {
      delete this.pendingCandidates[userId]
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
  sendFile(file, metadata = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.stompClient || !this.stompClient.connected) {
          reject(new Error("Not connected to WebSocket server"))
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const base64Data = e.target.result.split(',')[1]

          const fileData = {
            fileId: Date.now(),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: base64Data,
            senderId: this.userId,
            senderName: metadata.senderName || "Unknown",
            timestamp: new Date().toISOString()
          }

          this.stompClient.publish({
            destination: "/app/meeting.file",
            body: JSON.stringify({
              ...fileData,
              meetingCode: this.meetingCode
            })
          })

          resolve(fileData)
        }

        reader.onerror = (error) => {
          reject(error)
        }

        reader.readAsDataURL(file)
      } catch (error) {
        reject(error)
      }
    })
  }

  // Download a received file
  downloadFile(fileData) {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(fileData.fileData)
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

      const blob = new Blob(byteArrays, { type: fileData.fileType })

      // Use FileSaver.js to save the file
      saveAs(blob, fileData.fileName)
    } catch (error) {
      console.error("Error downloading file:", error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
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
  // sendLeaveMessage: if true, sends a leave message to the server (default: true)
  leaveMeeting(sendLeaveMessage = true) {
    if (this.stompClient && this.stompClient.connected) {
      // Only send leave message if explicitly requested
      if (sendLeaveMessage) {
        console.log("Sending leave message for user", this.userId, "in meeting", this.meetingCode);
        this.stompClient.publish({
          destination: "/app/meeting.leave",
          body: JSON.stringify({
            userId: this.userId,
            meetingCode: this.meetingCode
          })
        });
      }

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

      // Reset join status
      this.hasJoinedMeeting = false

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

  // Ensure connection and send offer - reliable method to establish connection
  async ensureConnectionAndSendOffer(userId) {
    console.log(`Ensuring connection and sending offer to user ${userId}`);

    try {
      // Step 1: Make sure we have a peer connection
      let peerConnection = this.peerConnections[userId];
      let needToCreateOffer = true;

      if (peerConnection) {
        // Check connection state
        const connectionState = peerConnection.connectionState;
        const iceConnectionState = peerConnection.iceConnectionState;
        const signalingState = peerConnection.signalingState;

        console.log(`Existing connection states for user ${userId}: connection=${connectionState}, ice=${iceConnectionState}, signaling=${signalingState}`);

        // If connection is in a bad state, recreate it
        if (connectionState === 'failed' || connectionState === 'disconnected' || connectionState === 'closed' ||
            iceConnectionState === 'failed' || iceConnectionState === 'disconnected') {
          console.log(`Connection is in bad state for user ${userId}, recreating`);

          // Close the existing connection
          this.closePeerConnection(userId);

          // Create a new connection
          peerConnection = await this.createPeerConnection(userId);
        }
        // If we're already in the process of connecting, don't create a new offer
        else if (signalingState === 'have-local-offer') {
          console.log(`Already have local offer for user ${userId}, not creating new offer`);
          needToCreateOffer = false;
        }
      } else {
        console.log(`No peer connection found for user ${userId}, creating new one`);
        peerConnection = await this.createPeerConnection(userId);
      }

      // Step 2: Make sure we have a local stream
      if (!this.localStream || this.localStream.getTracks().length === 0) {
        console.log(`No local stream or tracks for user ${userId}, getting user media`);
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          console.log(`Got user media with tracks: audio=${this.localStream.getAudioTracks().length}, video=${this.localStream.getVideoTracks().length}`);

          // Add tracks to the peer connection
          this.localStream.getTracks().forEach(track => {
            console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
            peerConnection.addTrack(track, this.localStream);
          });
        } catch (err) {
          console.error(`Failed to get user media for user ${userId}:`, err);
        }
      }

      // Step 3: Create and send offer if needed
      if (needToCreateOffer && this.localStream) {
        console.log(`Creating offer for user ${userId}`);
        const offer = await this.createOffer(userId);

        console.log(`Sending offer to user ${userId}`);
        this.stompClient.publish({
          destination: "/app/meeting.signal",
          body: JSON.stringify({
            type: "offer",
            targetUserId: userId,
            from: this.userId,
            meetingCode: this.meetingCode,
            payload: JSON.stringify(offer)
          })
        });
      }

      return true;
    } catch (err) {
      console.error(`Error ensuring connection for user ${userId}:`, err);
      return false;
    }
  }

  // Check and restart connection if needed
  checkAndRestartConnection(userId) {
    console.log(`Checking connection for user ${userId}`);

    // Use the reliable method to ensure connection
    this.ensureConnectionAndSendOffer(userId)
      .then(success => {
        if (success) {
          console.log(`Successfully checked/restarted connection for user ${userId}`);
        } else {
          console.warn(`Failed to check/restart connection for user ${userId}`);
        }
      })
      .catch(err => console.error(`Error in checkAndRestartConnection for user ${userId}:`, err));
  }
}

export const webrtcService = new WebRTCService()
