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
    this.isConnecting = false
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
  async initialize(userId, meetingCode) {
    // Nếu đang kết nối, đợi cho đến khi kết nối xong
    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Sau khi kết nối xong, trả về client hiện tại
      return this.stompClient;
    }
    this.isConnecting = true;

    // Nếu đã được khởi tạo với cùng thông số, không cần khởi tạo lại
    if (this.stompClient && this.stompClient.connected &&
        this.userId === userId && this.meetingCode === meetingCode) {
      this.isConnecting = false;
      return this.stompClient; // Return the existing client for chaining
    }

    // Nếu đã được khởi tạo nhưng với thông số khác, ngắt kết nối trước
    if (this.stompClient) {
      console.log("Disconnecting existing STOMP client before reinitializing");
      try {
        // Đóng tất cả các peer connections hiện có
        Object.keys(this.peerConnections).forEach(peerUserId => {
          this.closePeerConnection(peerUserId);
        });
        if (this.stompClient.connected) {
          this.stompClient.deactivate();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        this.stompClient = null;
      } catch (err) {
        console.error("Error while disconnecting STOMP client:", err);
        await new Promise(resolve => setTimeout(resolve, 500));
        this.stompClient = null;
      }
    }

    // Đặt lại các giá trị
    this.userId = userId;
    this.meetingCode = meetingCode;
    if (this.meetingCode !== meetingCode) {
      this.hasJoinedMeeting = false;
    }
    this.peerConnections = {};
    this.pendingCandidates = {};
    this.remoteStreams = {};

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080/ws";
    const socket = new SockJS(socketUrl, null, {
      transports: ["websocket", "xhr-streaming", "xhr-polling"],
      transportOptions: {
        websocket: { withCredentials: true },
        xhrStreaming: { withCredentials: true },
        xhrPolling: { withCredentials: true }
      }
    });

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.debug(str);
        }
      },
      reconnectDelay: 2000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectionTimeout: 10000
    });

    return new Promise((resolve, reject) => {
      this.stompClient.onConnect = (frame) => {
        console.log("Connected to STOMP broker:", frame);
        this.isConnecting = false;
        try {
          this.setupSubscriptions(userId, meetingCode);
          resolve(this.stompClient);
        } catch (err) {
          reject(err);
        }
      };
      this.stompClient.onStompError = (frame) => {
        this.isConnecting = false;
        console.error("STOMP error:", frame);
        reject(new Error(frame.headers && frame.headers.message ? frame.headers.message : "STOMP error"));
      };
      this.stompClient.onDisconnect = () => {
        this.isConnecting = false;
      };
      socket.onerror = (error) => {
        this.isConnecting = false;
        console.error("WebSocket Error:", error);
        reject(error);
      };
      try {
        this.stompClient.activate();
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  // Set up STOMP subscriptions
  setupSubscriptions(userId, meetingCode) {
    if (!this.stompClient) {
      console.error("Cannot setup subscriptions: STOMP client is null");
      return;
    }
    
    if (!this.stompClient.connected) {
      console.warn("STOMP client not yet connected, will retry setupSubscriptions after delay");
      setTimeout(() => {
        if (this.stompClient && this.stompClient.connected) {
          console.log("Retrying setupSubscriptions after delay");
          this.setupSubscriptions(userId, meetingCode);
        }
      }, 2000);
      return;
    }

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

      // Kiểm tra xem đã có kết nối cho người dùng này chưa
      if (this.peerConnections[userId]) {
        // Kiểm tra trạng thái kết nối hiện tại
        const peerConnection = this.peerConnections[userId];
        const connectionState = peerConnection.connectionState;
        const iceConnectionState = peerConnection.iceConnectionState;

        // Chỉ tái sử dụng kết nối nếu nó trong trạng thái tốt
        if ((connectionState === 'connected' || connectionState === 'new' || connectionState === 'connecting') && 
            (iceConnectionState === 'connected' || iceConnectionState === 'new' || iceConnectionState === 'checking')) {
          console.log(`Peer connection already exists for user ${userId} and is in good state, reusing it`);
          return this.peerConnections[userId];
        } else {
          console.log(`Peer connection exists for user ${userId} but is in bad state (${connectionState}/${iceConnectionState}), creating new one`);
          // Đóng kết nối cũ trước khi tạo mới
          this.closePeerConnection(userId);
        }
      }

      // Cấu hình các máy chủ ICE - bao gồm nhiều máy chủ hơn để tăng khả năng kết nối
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
          { urls: "stun:stun.stunprotocol.org:3478" }
        ],
        iceTransportPolicy: "all",
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle"
      };

      // Tạo kết nối mới
      const peerConnection = new RTCPeerConnection(configuration);
      console.log(`New RTCPeerConnection created for user ${userId}`);

      // Xử lý ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`ICE candidate generated for user ${userId}:`, 
            event.candidate.candidate ? event.candidate.candidate.substring(0, 30) + '...' : 'null candidate');
          
          // Kiểm tra xem STOMP client có sẵn và đã kết nối
          if (this.stompClient && this.stompClient.connected) {
            this.stompClient.publish({
              destination: "/app/meeting.signal",
              body: JSON.stringify({
                type: "ice-candidate",
                targetUserId: userId,
                from: this.userId,
                meetingCode: this.meetingCode,
                payload: JSON.stringify(event.candidate)
              })
            });
          } else {
            console.warn(`STOMP client not connected, cannot send ICE candidate for user ${userId}`);
            
            // Lưu candidate để gửi sau
            if (!this.pendingCandidates[userId]) {
              this.pendingCandidates[userId] = [];
            }
            this.pendingCandidates[userId].push(event.candidate);
          }
        } else {
          console.log(`ICE candidate gathering complete for user ${userId}`);
        }
      };

      // Theo dõi thay đổi trạng thái kết nối ICE
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state changed for user ${userId}: ${peerConnection.iceConnectionState}`);
        
        // Thử kết nối lại nếu ICE kết nối thất bại
        if (peerConnection.iceConnectionState === 'failed') {
          console.log(`ICE connection failed for user ${userId}, attempting to restart ICE`);
          // Thử khởi động lại ICE - hoạt động trên một số trình duyệt
          try {
            peerConnection.restartIce();
          } catch (error) {
            console.error(`Error restarting ICE for user ${userId}:`, error);
            // Nếu restart không hoạt động, tạo lại kết nối
            setTimeout(() => {
              if (this.peerConnections[userId] === peerConnection) {
                this.checkAndRestartConnection(userId);
              }
            }, 1000);
          }
        } else if (peerConnection.iceConnectionState === 'disconnected') {
          console.log(`ICE connection disconnected for user ${userId}, will attempt to reconnect if it doesn't recover`);
          // Đặt thời gian chờ để kiểm tra xem kết nối có tự phục hồi không
          setTimeout(() => {
            if (this.peerConnections[userId] === peerConnection && 
                peerConnection.iceConnectionState === 'disconnected') {
              console.log(`ICE connection still disconnected for user ${userId}, attempting to restart`);
              this.checkAndRestartConnection(userId);
            }
          }, 5000);
        }
      };

      // Theo dõi thay đổi trạng thái kết nối
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state changed for user ${userId}: ${peerConnection.connectionState}`);
        
        if (peerConnection.connectionState === 'failed') {
          console.log(`Connection failed for user ${userId}, will attempt to restart`);
          // Đóng kết nối cũ và tạo mới
          setTimeout(() => {
            if (this.peerConnections[userId] === peerConnection) {
              this.checkAndRestartConnection(userId);
            }
          }, 1000);
        }
      };

      // Theo dõi thay đổi trạng thái signaling
      peerConnection.onsignalingstatechange = () => {
        console.log(`Signaling state changed for user ${userId}: ${peerConnection.signalingState}`);
      };

      // Xử lý remote tracks
      peerConnection.ontrack = (event) => {
        console.log(`Remote track received from user ${userId}:`,
                    event.track.kind,
                    event.streams ? `(streams: ${event.streams.length})` : '(no streams)');

        // Ghi log thông tin chi tiết về track
        console.log(`Track details - kind: ${event.track.kind}, enabled: ${event.track.enabled}, readyState: ${event.track.readyState}, muted: ${event.track.muted}`);

        // Tạo stream mới nếu không có
        let stream = null;
        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
          console.log(`Using existing stream from event for user ${userId}`);
        } else {
          // Nếu không có stream, tạo mới
          console.log(`No stream provided in track event for user ${userId}, creating new stream`);
          stream = new MediaStream([event.track]);
        }

        // Thêm thuộc tính dữ liệu cho stream để gỡ lỗi và nhận dạng
        stream.userId = userId;

        // Thêm thuộc tính tùy chỉnh để giúp nhận dạng stream này
        Object.defineProperty(stream, 'remoteUserId', {
          value: userId,
          writable: false,
          configurable: true
        });

        console.log(`Remote stream for user ${userId}:`,
                    `audio tracks: ${stream.getAudioTracks().length}`,
                    `video tracks: ${stream.getVideoTracks().length}`);

        // Lưu stream trong tham chiếu nội bộ để truy cập trực tiếp
        // Quan trọng để component MeetingRoom tìm thấy stream
        this.storeRemoteStream(userId, stream);

        // Lưu stream trong đối tượng window toàn cục để gỡ lỗi
        if (typeof window !== 'undefined') {
          if (!window.debugStreams) {
            window.debugStreams = {};
          }
          window.debugStreams[userId] = stream;
        }

        if (this.callbacks.onRemoteStreamAdded) {
          // Đảm bảo truyền đúng user ID với stream
          console.log(`Calling onRemoteStreamAdded callback for user ${userId}`);
          this.callbacks.onRemoteStreamAdded(userId, stream);
        } else {
          console.warn(`No onRemoteStreamAdded callback registered for user ${userId}`);
        }
      };

      // Thêm local tracks vào peer connection
      if (this.localStream) {
        console.log(`Adding local tracks to peer connection for user ${userId} - audio tracks: ${this.localStream.getAudioTracks().length}, video tracks: ${this.localStream.getVideoTracks().length}`);

        // Đảm bảo có tracks để thêm
        const tracks = this.localStream.getTracks();
        if (tracks.length === 0) {
          console.warn(`No tracks found in local stream for user ${userId}, attempting to get user media`);

          // Thử lấy user media nếu không có tracks
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log(`Got new user media with tracks: audio=${stream.getAudioTracks().length}, video=${stream.getVideoTracks().length}`);
            this.localStream = stream;

            // Thêm tracks mới vào peer connection
            stream.getTracks().forEach(track => {
              console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
              peerConnection.addTrack(track, stream);
            });
          } catch (err) {
            console.error("Failed to get user media:", err);
            // Tiếp tục mà không có tracks - kết nối vẫn có thể được thiết lập cho audio/video một chiều
          }
        } else {
          // Thêm tracks hiện có
          tracks.forEach((track) => {
            console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
            peerConnection.addTrack(track, this.localStream);
          });
        }
      } else {
        console.warn(`No local stream available for user ${userId}, attempting to get user media`);

        // Thử lấy user media nếu không có local stream
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          console.log(`Got new user media with tracks: audio=${stream.getAudioTracks().length}, video=${stream.getVideoTracks().length}`);
          this.localStream = stream;

          // Thêm tracks mới vào peer connection
          stream.getTracks().forEach(track => {
            console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
            peerConnection.addTrack(track, stream);
          });
        } catch (err) {
          console.error("Failed to get user media:", err);
          // Tiếp tục mà không có tracks - kết nối vẫn có thể được thiết lập cho audio/video một chiều
        }
      }

      // Lưu kết nối mới
      this.peerConnections[userId] = peerConnection;
      return peerConnection;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      if (this.callbacks.onError) {
        this.callbacks.onError({
          message: "Lỗi khi tạo kết nối P2P với người dùng khác",
          originalError: error
        });
      }
      throw error;
    }
  }

  // Create an answer for a peer connection
  async createAnswer(userId, offer) {
    try {
      console.log("Tạo answer cho người dùng:", userId);

      // Đảm bảo có peer connection cho người dùng này
      if (!this.peerConnections[userId]) {
        console.log("Tạo peer connection cho người dùng trước khi trả lời:", userId);
        await this.createPeerConnection(userId);
      }

      const peerConnection = this.peerConnections[userId];

      // Đặt remote description trước
      console.log("Đặt remote description từ offer");
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Xử lý các ICE candidate đang chờ xử lý
        await this.processPendingCandidates(userId);

        // Sau đó tạo answer
        console.log("Đang tạo answer");
        const answer = await peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        // Đặt local description
        console.log("Đặt local description từ answer");
        await peerConnection.setLocalDescription(answer);

        return answer;
      } catch (err) {
        console.error("Lỗi khi đặt remote description hoặc tạo answer:", err);

        // Nếu có lỗi, tạo lại peer connection và thử lại
        console.log("Tạo lại peer connection sau lỗi");
        this.closePeerConnection(userId);
        
        // Đợi một chút trước khi tạo kết nối mới
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.createPeerConnection(userId);

        const newPeerConnection = this.peerConnections[userId];

        // Thử lại với peer connection mới
        console.log("Thử lại với peer connection mới");
        await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Xử lý các ICE candidate đang chờ xử lý
        await this.processPendingCandidates(userId);

        // Tạo answer
        const answer = await newPeerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        // Đặt local description
        await newPeerConnection.setLocalDescription(answer);

        return answer;
      }
    } catch (error) {
      console.error("Lỗi khi tạo answer:", error);
      if (this.callbacks.onError) {
        this.callbacks.onError({
          message: `Lỗi khi tạo câu trả lời cho kết nối: ${error.message}`,
          originalError: error
        });
      }
      throw error;
    }
  }

  // Handle an answer for a peer connection
  async handleAnswer(userId, answer) {
    try {
      console.log("Handling answer from user:", userId);

      const peerConnection = this.peerConnections[userId];
      if (!peerConnection) {
        console.warn(`Không tìm thấy peer connection cho người dùng ${userId}, bỏ qua answer`);
        return;
      }

      // Kiểm tra trạng thái signaling hiện tại
      const currentState = peerConnection.signalingState;
      console.log(`Trạng thái signaling hiện tại cho ${userId}: ${currentState}`);

      // Chỉ đặt remote description nếu chúng ta đang ở trạng thái have-local-offer
      if (currentState === 'have-local-offer') {
        console.log("Đặt remote description từ answer (trạng thái phù hợp)");
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("Remote description set successfully");

          // Xử lý các ICE candidate đang chờ xử lý
          await this.processPendingCandidates(userId);
        } catch (err) {
          console.error(`Lỗi khi đặt remote description: ${err.message}`);
          
          // Nếu đặt remote description thất bại, có thể trạng thái kết nối đã bị hỏng
          // Tạo lại kết nối từ đầu
          this.closePeerConnection(userId);
          
          // Đợi một chút trước khi tạo kết nối mới
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Tạo kết nối mới và gửi offer mới
          await this.ensureConnectionAndSendOffer(userId);
        }
      } else if (currentState === 'stable') {
        // Nếu chúng ta đang ở trạng thái stable, có thể chúng ta đã xử lý answer này rồi
        console.log(`Kết nối đã ở trạng thái ổn định (stable), bỏ qua answer`);
      } else if (currentState === 'have-remote-offer') {
        // Lỗi phổ biến: nhận được answer khi chúng ta đang ở trạng thái have-remote-offer
        console.warn(`Không thể đặt remote description (answer) trong trạng thái have-remote-offer`);
        console.log(`Tạo lại kết nối P2P để khắc phục xung đột trạng thái`);
        
        // Đóng kết nối hiện tại
        this.closePeerConnection(userId);
        
        // Đợi một chút trước khi tạo kết nối mới
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Tạo kết nối mới và gửi offer mới
        await this.ensureConnectionAndSendOffer(userId);
      } else {
        // Trạng thái không mong đợi khác, tạo lại kết nối
        console.warn(`Trạng thái signaling không mong đợi: ${currentState}, tạo lại kết nối`);
        
        // Đóng kết nối hiện tại
        this.closePeerConnection(userId);
        
        // Đợi một chút trước khi tạo kết nối mới
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Tạo kết nối mới và gửi offer mới
        await this.ensureConnectionAndSendOffer(userId);
      }
    } catch (error) {
      console.error("Lỗi xử lý answer:", error, "cho người dùng:", userId);
      if (this.callbacks.onError) {
        this.callbacks.onError({
          message: `Lỗi xử lý answer từ người dùng khác: ${error.message}`,
          originalError: error
        });
      }
    }
  }

  // Add an ICE candidate to a peer connection
  async addIceCandidate(userId, candidate) {
    try {
      console.log(`Thêm ICE candidate cho người dùng ${userId}:`, candidate.candidate ? candidate.candidate.substring(0, 50) + '...' : 'null candidate');

      // Tạo peer connection nếu chưa tồn tại
      if (!this.peerConnections[userId]) {
        console.log(`Không tìm thấy peer connection cho người dùng ${userId}, tạo mới`);
        await this.createPeerConnection(userId);
      }

      const peerConnection = this.peerConnections[userId];

      // Kiểm tra xem remote description đã được đặt chưa trước khi thêm ICE candidates
      if (peerConnection.remoteDescription) {
        console.log(`Remote description đã được đặt cho người dùng ${userId}, thêm ICE candidate ngay lập tức`);
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`ICE candidate được thêm thành công cho người dùng ${userId}`);
        } catch (err) {
          console.error(`Thất bại khi thêm ICE candidate cho người dùng ${userId}:`, err);

          // Kiểm tra trạng thái kết nối nếu thêm candidate thất bại
          if (peerConnection.connectionState === 'failed' ||
              peerConnection.connectionState === 'disconnected' ||
              peerConnection.connectionState === 'closed') {

            console.log(`Trạng thái kết nối là ${peerConnection.connectionState}, tạo lại peer connection`);

            // Đóng kết nối hiện tại
            this.closePeerConnection(userId);

            // Tạo kết nối mới
            await this.createPeerConnection(userId);

            // Lưu candidate để xử lý sau
            if (!this.pendingCandidates) {
              this.pendingCandidates = {};
            }
            if (!this.pendingCandidates[userId]) {
              this.pendingCandidates[userId] = [];
            }
            this.pendingCandidates[userId].push(candidate);

            // Nếu chúng ta có local stream, tạo và gửi offer mới
            if (this.localStream && this.stompClient && this.stompClient.connected) {
              try {
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
              } catch (offerErr) {
                console.error(`Lỗi tạo offer mới sau khi tạo lại kết nối: ${offerErr}`);
              }
            }
          }
        }
      } else {
        console.warn(`Không thể thêm ICE candidate cho người dùng ${userId}: remote description chưa được đặt, lưu để xử lý sau`);
        // Lưu candidate để thêm sau
        if (!this.pendingCandidates) {
          this.pendingCandidates = {};
        }
        if (!this.pendingCandidates[userId]) {
          this.pendingCandidates[userId] = [];
        }
        this.pendingCandidates[userId].push(candidate);
        console.log(`Đã lưu ICE candidate chờ xử lý cho người dùng ${userId}, tổng số chờ: ${this.pendingCandidates[userId].length}`);
      }
    } catch (error) {
      console.error(`Lỗi khi thêm ICE candidate cho người dùng ${userId}:`, error);
      if (this.callbacks.onError) {
        this.callbacks.onError({
          message: `Lỗi xử lý ICE candidate: ${error.message}`,
          originalError: error
        });
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
      // Kiểm tra quyền trước khi yêu cầu stream
      if (navigator.permissions && navigator.permissions.query) {
        try {
          // Kiểm tra quyền camera nếu constraints có video
          if (constraints.video) {
            const cameraPermission = await navigator.permissions.query({ name: 'camera' });
            if (cameraPermission.state === 'denied') {
              throw new Error('Camera permission denied by the browser. Please enable camera access in your browser settings.');
            }
          }
          
          // Kiểm tra quyền microphone nếu constraints có audio
          if (constraints.audio) {
            const micPermission = await navigator.permissions.query({ name: 'microphone' });
            if (micPermission.state === 'denied') {
              throw new Error('Microphone permission denied by the browser. Please enable microphone access in your browser settings.');
            }
          }
        } catch (permError) {
          console.warn("Unable to check permissions directly, will attempt to get media anyway:", permError);
          // Tiếp tục thử getUserMedia ngay cả khi kiểm tra quyền thất bại
        }
      }

      // Thử với cả hai thiết bị trước
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        return this.localStream;
      } catch (bothError) {
        console.warn("Failed to get both audio and video:", bothError);
        
        // Nếu không thể truy cập cả hai, thử chỉ với audio nếu yêu cầu audio
        if (constraints.audio) {
          try {
            console.log("Trying with audio only...");
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            
            if (this.callbacks.onError) {
              this.callbacks.onError({
                message: "Unable to access camera, but microphone is working. Video will be disabled.",
                originalError: bothError
              });
            }
            
            return this.localStream;
          } catch (audioError) {
            console.error("Failed with audio only too:", audioError);
          }
        }
        
        // Nếu audio cũng thất bại hoặc không yêu cầu audio, thử chỉ với video nếu yêu cầu video
        if (constraints.video) {
          try {
            console.log("Trying with video only...");
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            
            if (this.callbacks.onError) {
              this.callbacks.onError({
                message: "Unable to access microphone, but camera is working. Audio will be disabled.",
                originalError: bothError
              });
            }
            
            return this.localStream;
          } catch (videoError) {
            console.error("Failed with video only too:", videoError);
          }
        }
        
        // Nếu tất cả đều thất bại, ném lỗi gốc
        throw bothError;
      }
    } catch (error) {
      console.error("Error getting user media:", error);
      
      // Chi tiết hơn về lỗi để người dùng biết phải làm gì
      let errorMessage = "Không thể truy cập camera hoặc microphone.";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Trình duyệt đã từ chối quyền truy cập camera hoặc microphone. Vui lòng cho phép truy cập trong cài đặt trình duyệt.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra xem thiết bị đã được kết nối chưa.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Camera hoặc microphone đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.";
      } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
        errorMessage = "Không thể đáp ứng yêu cầu chất lượng camera/microphone. Vui lòng thử với cài đặt thấp hơn.";
      } else if (error.name === "TypeError") {
        errorMessage = "Các tham số không hợp lệ khi yêu cầu truy cập camera/microphone.";
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      
      if (this.callbacks.onError) {
        this.callbacks.onError(enhancedError);
      }
      
      throw enhancedError;
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
        this.closePeerConnection(userId);
      });

      // Dừng hoàn toàn các local stream và giải phóng tài nguyên
      if (this.localStream) {
        console.log("Stopping all local tracks before leaving meeting");
        this.localStream.getTracks().forEach(track => {
          console.log(`Stopping ${track.kind} track`);
          track.stop();
        });
        this.localStream = null;
      }

      // Dừng stream chia sẻ màn hình
      if (this.screenStream) {
        console.log("Stopping screen sharing before leaving meeting");
        this.screenStream.getTracks().forEach(track => {
          console.log(`Stopping ${track.kind} screen track`);
          track.stop();
        });
        this.screenStream = null;
      }

      // Đặt lại trạng thái tham gia cuộc họp
      this.hasJoinedMeeting = false;

      // Ngắt kết nối STOMP client
      this.stompClient.deactivate();
      this.stompClient = null;
      
      // Đặt lại các giá trị khác
      this.peerConnections = {};
      this.pendingCandidates = {};
      this.remoteStreams = {};
      
      console.log("Successfully left meeting and released all media resources");
    } else {
      console.log("No active connection to leave");
      
      // Vẫn cần dừng local stream nếu còn tồn tại
      if (this.localStream) {
        console.log("Stopping local tracks even without active connection");
        this.localStream.getTracks().forEach(track => {
          console.log(`Stopping ${track.kind} track`);
          track.stop();
        });
        this.localStream = null;
      }
      
      if (this.screenStream) {
        console.log("Stopping screen sharing tracks");
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }
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
    
    // Thêm khóa để ngăn chặn các cuộc gọi đồng thời đến cùng một user
    const connectionKey = `connection_${userId}`;
    if (this[connectionKey]) {
      console.log(`Connection already in progress for user ${userId}, waiting...`);
      try {
        await this[connectionKey];
        console.log(`Previous connection attempt completed for user ${userId}`);
      } catch (err) {
        console.error(`Previous connection attempt failed for user ${userId}:`, err);
      }
    }
    
    // Tạo promise mới để theo dõi nỗ lực kết nối này
    this[connectionKey] = (async () => {
      try {
        // Bước 1: Đảm bảo có peer connection
        let peerConnection = this.peerConnections[userId];
        let needToCreateOffer = true;
        
        if (peerConnection) {
          // Kiểm tra trạng thái kết nối
          const connectionState = peerConnection.connectionState;
          const iceConnectionState = peerConnection.iceConnectionState;
          const signalingState = peerConnection.signalingState;
          
          console.log(`Existing connection states for user ${userId}: connection=${connectionState}, ice=${iceConnectionState}, signaling=${signalingState}`);
          
          // Nếu kết nối trong trạng thái không tốt, tạo lại
          if (connectionState === 'failed' || connectionState === 'disconnected' || connectionState === 'closed' ||
              iceConnectionState === 'failed' || iceConnectionState === 'disconnected') {
            console.log(`Connection is in bad state for user ${userId}, recreating`);
            
            // Đóng kết nối hiện có
            this.closePeerConnection(userId);
            
            // Đợi một chút trước khi tạo kết nối mới để đảm bảo nguồn lực được giải phóng
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Tạo kết nối mới
            peerConnection = await this.createPeerConnection(userId);
          }
          // Nếu đang trong quá trình kết nối, không tạo offer mới
          else if (signalingState === 'have-local-offer') {
            console.log(`Already have local offer for user ${userId}, checking if it's fresh`);
            
            // Thêm logic kiểm tra thời gian tạo offer
            const offerTimestamp = peerConnection._offerTimestamp;
            const currentTime = Date.now();
            
            if (offerTimestamp && (currentTime - offerTimestamp < 10000)) {
              console.log(`Offer is fresh (less than 10s old), not creating new offer`);
              needToCreateOffer = false;
            } else {
              console.log(`Offer is stale or missing timestamp, creating new offer`);
              // Đặt trạng thái về stable nếu cần
              try {
                if (peerConnection.signalingState !== 'stable') {
                  await peerConnection.setLocalDescription({type: 'rollback'});
                }
              } catch (err) {
                // Một số trình duyệt không hỗ trợ rollback, trong trường hợp đó tạo lại kết nối
                console.warn(`Rollback not supported, recreating peer connection`);
                this.closePeerConnection(userId);
                await new Promise(resolve => setTimeout(resolve, 500));
                peerConnection = await this.createPeerConnection(userId);
              }
            }
          }
        } else {
          console.log(`No peer connection found for user ${userId}, creating new one`);
          peerConnection = await this.createPeerConnection(userId);
        }
        
        // Bước 2: Đảm bảo có local stream
        if (!this.localStream || this.localStream.getTracks().length === 0) {
          console.log(`No local stream or tracks for user ${userId}, getting user media`);
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log(`Got user media with tracks: audio=${this.localStream.getAudioTracks().length}, video=${this.localStream.getVideoTracks().length}`);
            
            // Thêm tracks vào peer connection
            const senders = peerConnection.getSenders();
            this.localStream.getTracks().forEach(track => {
              // Kiểm tra xem track đã được thêm chưa
              const hasSender = senders.some(sender => sender.track && sender.track.kind === track.kind);
              if (!hasSender) {
                console.log(`Adding ${track.kind} track to peer connection for user ${userId}`);
                peerConnection.addTrack(track, this.localStream);
              } else {
                console.log(`Track ${track.kind} already added for user ${userId}`);
              }
            });
          } catch (err) {
            console.error(`Failed to get user media for user ${userId}:`, err);
            if (this.callbacks.onError) {
              this.callbacks.onError({
                message: "Không thể truy cập camera hoặc microphone khi kết nối với người dùng khác",
                originalError: err
              });
            }
          }
        } else {
          // Kiểm tra xem chúng ta đã thêm tracks vào kết nối chưa
          const senders = peerConnection.getSenders();
          const localTracks = this.localStream.getTracks();
          
          if (senders.length < localTracks.length) {
            console.log(`Adding missing tracks to peer connection for user ${userId}`);
            
            // Thêm các track còn thiếu
            localTracks.forEach(track => {
              const hasSender = senders.some(sender => sender.track && sender.track.kind === track.kind);
              if (!hasSender) {
                console.log(`Adding missing ${track.kind} track to peer connection for user ${userId}`);
                peerConnection.addTrack(track, this.localStream);
              }
            });
          }
        }
        
        // Bước 3: Tạo và gửi offer nếu cần
        if (needToCreateOffer && this.localStream) {
          console.log(`Creating offer for user ${userId}`);
          const offer = await this.createOffer(userId);
          
          // Lưu timestamp cho offer
          peerConnection._offerTimestamp = Date.now();
          
          console.log(`Sending offer to user ${userId}`);
          if (this.stompClient && this.stompClient.connected) {
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
          } else {
            console.error(`STOMP client not connected, cannot send offer to user ${userId}`);
            // Thử kết nối lại STOMP client nếu cần
            if (!this.stompClient || !this.stompClient.connected) {
              console.log(`Attempting to reconnect STOMP client...`);
              this.initialize(this.userId, this.meetingCode);
            }
          }
        }
        
        return true;
      } catch (err) {
        console.error(`Error ensuring connection for user ${userId}:`, err);
        return false;
      } finally {
        // Luôn xóa khóa khi hoàn thành (thành công hoặc thất bại)
        delete this[connectionKey];
      }
    })();
    
    // Trả về kết quả cuối cùng của promise
    return await this[connectionKey];
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

  // Create an offer for a peer connection
  async createOffer(userId) {
    try {
      const peerConnection = this.peerConnections[userId];
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Lỗi khi tạo offer:", error);
      if (this.callbacks.onError) {
        this.callbacks.onError({
          message: `Lỗi khi tạo yêu cầu kết nối: ${error.message}`,
          originalError: error
        });
      }
      throw error;
    }
  }
}

export const webrtcService = new WebRTCService()
