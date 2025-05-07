"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { meetingService } from "../services/meetingService"
import { webrtcService } from "../services/webrtcService"
import {
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
  ScreenShare,
  PhoneOff,
  MessageSquare,
  UsersIcon,
  X,
  Send,
  MoreVertical,
  UserPlus,
  Share2,
  FileText,
  Download,
  Paperclip,
  AlertTriangle,
  RefreshCw
} from "lucide-react"

const MeetingRoom = () => {
  const { meetingCode } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuth().currentUser

  const [meeting, setMeeting] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const [participants, setParticipants] = useState([])
  const [activeParticipant, setActiveParticipant] = useState(null)

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [messageInput, setMessageInput] = useState("")
  const [fileUploading, setFileUploading] = useState(false)
  const [receivedFiles, setReceivedFiles] = useState([])

  const fileInputRef = useRef(null)
  const localVideoRef = useRef(null)
  const screenShareRef = useRef(null)
  const participantRefs = useRef({})
  const chatContainerRef = useRef(null)

  // Initialize meeting and WebRTC
  useEffect(() => {
    console.log(meetingCode);
    const initializeMeeting = async () => {
      try {
        // Fetch meeting details
        const meetingData = await meetingService.getMeeting(meetingCode)
        if (meetingData.code === 200) {
          setMeeting(meetingData.result)
          setIsHost(meetingData.result.hostId === currentUser.id)

          // Fetch participants first
          const participants = await meetingService.getMeetingParticipants(meetingCode)
          setParticipants(participants)
          console.log("người dùng", participants)
          if (participants.length > 0) {
            setActiveParticipant(participants[0].id)
          }

          // Ensure the current user is in the participants list - ONLY check user.id
          const currentUserInParticipants = participants.some(p =>
            p.user && p.user.id === currentUser.id
          );

          if (!currentUserInParticipants) {
            console.log("Current user not found in participants, refreshing participant list");
            // This should trigger a refresh of the participants list from the server
            try {
              const updatedParticipants = await meetingService.getMeetingParticipants(meetingCode);

              // Check if current user is in the updated list - ONLY check user.id
              const userFoundInUpdated = updatedParticipants.some(p =>
                p.user && p.user.id === currentUser.id
              );

              if (!userFoundInUpdated) {
                console.log("Current user still not found in updated participants list, adding manually");

                // Add current user to participants list manually
                const currentUserParticipant = {
                  id: Date.now(), // Generate a temporary ID
                  name: currentUser.name || currentUser.fullName || "You",
                  audioEnabled: true,
                  videoEnabled: true,
                  role: "PARTICIPANT",
                  isOnline: true,
                  user: {
                    id: currentUser.id,
                    fullName: currentUser.name || currentUser.fullName || "You"
                  }
                };

                updatedParticipants.push(currentUserParticipant);
              }

              setParticipants(updatedParticipants);
            } catch (err) {
              console.error("Error refreshing participants:", err);
            }
          }

          // Initialize WebRTC after participants are loaded - this is the ONLY place WebRTC should be initialized
          await initializeWebRTC()
        } else {
          throw new Error(meetingData.message || "Failed to load meeting")
        }
      } catch (err) {
        console.error("Error initializing meeting:", err)
        setError("Failed to join the meeting. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    initializeMeeting()
  }, [meetingCode, currentUser.id])

  // Initialize WebRTC with SockJS/STOMP - this is the ONLY place WebRTC should be initialized
  const initializeWebRTC = async () => {
    try {
      console.log("Initializing WebRTC in MeetingRoom, connection status:",
                  webrtcService.stompClient ?
                  (webrtcService.stompClient.connected ? "connected" : "disconnected") :
                  "not initialized");

      // Get user media (camera and microphone) if not already available
      let stream = webrtcService.localStream;
      if (!stream) {
        console.log("Getting user media for camera and microphone");
        stream = await webrtcService.getUserMedia({ video: true, audio: true });
        console.log("User media obtained:", stream ? "success" : "failed");
      } else {
        console.log("Reusing existing local stream");
      }

      // Display local video in the hidden element for WebRTC initialization
      if (localVideoRef.current) {
        console.log("Setting local video reference");
        localVideoRef.current.srcObject = stream;
      }

      // Store the local stream for the current user's participant video
      // We'll use this reference when rendering the participant videos
      console.log("Storing local stream references for current user");
      participantRefs.current[`stream_${currentUser.id}`] = stream;

      // Find current user in participants list by user.id ONLY
      const currentUserParticipant = participants.find(p =>
        p.user && p.user.id === currentUser.id
      );

      if (currentUserParticipant) {
        console.log(`Found current user in participants list: ${currentUserParticipant.name} (ID: ${currentUserParticipant.id}, user ID: ${currentUserParticipant.user.id})`);

        // Store the stream by both participant ID and user ID
        participantRefs.current[`stream_${currentUserParticipant.id}`] = stream;
        participantRefs.current[`stream_${currentUserParticipant.user.id}`] = stream;

        // If we already have a video element for the current user, set the stream
        // Try setting by user ID first (preferred)
        if (participantRefs.current[currentUserParticipant.user.id]) {
          console.log("Setting stream for current user's video element by user ID");
          participantRefs.current[currentUserParticipant.user.id].srcObject = stream;
        }

        // Also set by participant ID as fallback
        if (participantRefs.current[currentUserParticipant.id]) {
          console.log("Setting stream for current user's video element by participant ID");
          participantRefs.current[currentUserParticipant.id].srcObject = stream;
        }
      } else {
        console.log("Current user not found in participants list, will use user ID for stream reference");
        // Store the stream by user ID
        participantRefs.current[`stream_${currentUser.id}`] = stream;
      }

      // Only initialize WebRTC if it hasn't been initialized already or if it's disconnected
      if (!webrtcService.stompClient || !webrtcService.stompClient.connected) {
        console.log("WebRTC not initialized or disconnected, initializing now");
        webrtcService.initialize(currentUser.id, meetingCode);
      } else {
        console.log("WebRTC already initialized and connected, reusing connection");
      }

      // Set up callbacks - always set these up in case they were lost during navigation
      webrtcService.setCallbacks({
        onParticipantJoined: handleParticipantJoined,
        onParticipantLeft: handleParticipantLeft,
        onRemoteStreamAdded: handleRemoteStreamAdded,
        onMessageReceived: handleMessageReceived,
        onFileReceived: handleFileReceived,
        onParticipantAudioToggle: handleParticipantAudioToggle,
        onParticipantVideoToggle: handleParticipantVideoToggle,
        onError: handleWebRTCError,
      });

      // Ensure we join the meeting to send signals to other participants
      if (!webrtcService.hasJoinedMeeting) {
        console.log("Sending join signal to other participants");
        // This will trigger the server to notify other participants
        webrtcService.stompClient.publish({
          destination: "/app/meeting.join",
          body: JSON.stringify({
            userId: currentUser.id,
            meetingCode: meetingCode
          })
        });
        webrtcService.hasJoinedMeeting = true;

        // Create peer connections with all existing participants using the reliable method
        await ensureConnectionsWithAllParticipants();
      } else {
        console.log("Already joined meeting, checking connections with all participants");
        // Even if we've already joined, ensure all connections are established
        await ensureConnectionsWithAllParticipants();
      }
    } catch (err) {
      console.error("Error initializing WebRTC:", err);
      setError("Failed to access camera or microphone. Please check your permissions.");
    }
  }

  // Ensure connections with all participants
  const ensureConnectionsWithAllParticipants = async () => {
    console.log("Ensuring connections with all participants");

    // Process participants in parallel for faster connection establishment
    const connectionPromises = participants
      .filter(participant => participant.user && participant.user.id !== currentUser.id)
      .map(async (participant) => {
        const participantUserId = participant.user?.id;
        if (!participantUserId) return;

        console.log(`Ensuring connection with participant: ${participant.name} (user ID: ${participantUserId})`);
        try {
          // Use the reliable method to ensure connection and send offer
          await webrtcService.ensureConnectionAndSendOffer(participantUserId);
          return true;
        } catch (err) {
          console.error(`Error ensuring connection with participant ${participant.name}:`, err);
          return false;
        }
      });

    // Wait for all connections to be established
    await Promise.all(connectionPromises);

    // Set a timer to check connections again after a delay
    // This helps ensure connections are established even if there were issues
    setTimeout(() => {
      console.log("Checking connections with all participants again after delay");
      participants
        .filter(participant => participant.user && participant.user.id !== currentUser.id)
        .forEach(participant => {
          const participantUserId = participant.user?.id;
          if (!participantUserId) return;

          // Check if we have a remote stream for this participant
          if (!webrtcService.remoteStreams[participantUserId]) {
            console.log(`No remote stream for participant ${participant.name} after delay, retrying connection`);
            webrtcService.ensureConnectionAndSendOffer(participantUserId);
          }
        });
    }, 10000); // Tăng từ 5000ms lên 10000ms
  }

  // Handle participant joined
  const handleParticipantJoined = async (data) => {
    try {
      console.log(`Participant joined with user ID: ${data.userId}`);

      // Fetch updated participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingCode);

      // Update the participants state
      setParticipants(participantsData);

      // Find the participant that joined - ONLY by user.id
      const participant = participantsData.find(p => p.user && p.user.id === data.userId);

      if (!participant) {
        console.warn(`Could not find participant with user ID ${data.userId} in updated list`);
        return;
      }

      console.log(`Participant found: ${participant.name} (participant ID: ${participant.id}, user ID: ${participant.user.id})`);

      // Add system message to chat
      addSystemMessage(`${participant.name} joined the meeting`);

      // Ensure we create a peer connection with the new participant
      // This is critical to establish video/audio connection
      if (participant.user && participant.user.id) {
        console.log(`Ensuring connection with new participant: ${participant.name} (user ID: ${participant.user.id})`);

        try {
          // Use the reliable method to ensure connection and send offer
          await webrtcService.ensureConnectionAndSendOffer(participant.user.id);

          // Set a retry timer to make sure the connection is established
          setTimeout(() => {
            // Check if we have a remote stream - if not, try again
            if (!webrtcService.remoteStreams[participant.user.id]) {
              console.log(`No remote stream found for participant ${participant.name} after initial connection, retrying...`);
              webrtcService.ensureConnectionAndSendOffer(participant.user.id);
            }
          }, 3000);
        } catch (err) {
          console.error(`Error ensuring connection with participant ${participant.name}:`, err);
        }
      }

      // Check if we already have a stream for this participant - prioritize user.id
      const hasStreamByUserId = !!participantRefs.current[`stream_${participant.user.id}`];
      const hasStreamByParticipantId = !!participantRefs.current[`stream_${participant.id}`];

      if (hasStreamByUserId || hasStreamByParticipantId) {
        console.log(`Found existing stream for participant ${participant.name}, applying to video element`);

        // Apply the stream to the video element if it exists
        setTimeout(() => {
          // Prioritize setting by user ID
          if (participantRefs.current[participant.user.id]) {
            console.log(`Setting stream for video element with user ID: ${participant.user.id}`);

            // Choose the stream based on availability
            const stream = hasStreamByUserId
              ? participantRefs.current[`stream_${participant.user.id}`]
              : participantRefs.current[`stream_${participant.id}`];

            participantRefs.current[participant.user.id].srcObject = stream;
          }

          // Also set by participant ID as fallback
          if (participantRefs.current[participant.id]) {
            console.log(`Setting stream for video element with participant ID: ${participant.id}`);

            // Choose the stream based on availability
            const stream = hasStreamByUserId
              ? participantRefs.current[`stream_${participant.user.id}`]
              : participantRefs.current[`stream_${participant.id}`];

            participantRefs.current[participant.id].srcObject = stream;
          }
        }, 200);
      }

      // Note: We already called ensureConnectionAndSendOffer above, so we don't need this duplicate code
      // The reliable method will handle all the connection logic including getting user media if needed
    } catch (err) {
      console.error("Error handling participant joined:", err);
    }
  }

  // Handle participant left
  const handleParticipantLeft = async (data) => {
    try {
      console.log(`Participant left with user ID: ${data.userId}`);

      // Find the participant in the current list before fetching updated list
      // Check both participant.id and participant.user.id
      const leavingParticipant = participants.find(p =>
        p.id === data.userId || (p.user && p.user.id === data.userId)
      );

      // Fetch updated participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingCode);

      console.log("Updated participants after leave:");
      participantsData.forEach(p => {
        console.log(`- Participant: id=${p.id}, name=${p.name}, user.id=${p.user?.id}`);
      });

      setParticipants(participantsData);

      // Add system message to chat using the participant we found earlier
      if (leavingParticipant) {
        addSystemMessage(`${leavingParticipant.name} left the meeting`);

        // Clean up any references to this participant
        if (leavingParticipant.id) {
          delete participantRefs.current[leavingParticipant.id];
          delete participantRefs.current[`stream_${leavingParticipant.id}`];
        }

        if (leavingParticipant.user && leavingParticipant.user.id) {
          delete participantRefs.current[leavingParticipant.user.id];
          delete participantRefs.current[`stream_${leavingParticipant.user.id}`];
        }
      } else {
        console.log(`Could not find leaving participant with user ID: ${data.userId}`);

        // Clean up by user ID anyway
        delete participantRefs.current[data.userId];
        delete participantRefs.current[`stream_${data.userId}`];

        addSystemMessage(`A participant left the meeting`);
      }

      // If active participant left, switch to another participant
      if (leavingParticipant && activeParticipant === leavingParticipant.id) {
        if (participantsData.length > 0) {
          setActiveParticipant(participantsData[0].id);
        } else {
          setActiveParticipant(null);
        }
      }
    } catch (err) {
      console.error("Error handling participant left:", err);
    }
  }

  // Handle remote stream added
  const handleRemoteStreamAdded = (userId, stream) => {
    console.log(`Remote stream added for user ID: ${userId}`);

    // Check if the stream has tracks
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    console.log(`Stream has ${audioTracks.length} audio tracks and ${videoTracks.length} video tracks`);

    if (audioTracks.length === 0 && videoTracks.length === 0) {
      console.warn(`Stream for user ${userId} has no tracks, ignoring`);
      return;
    }

    // Add a data attribute to the stream for debugging and identification
    stream.userId = userId;

    // Store the stream in our local references to ensure it's available
    // when the video element is created - store by user ID
    participantRefs.current[`stream_${userId}`] = stream;

    // Force a re-render to ensure the video elements are updated with the new stream
    setParticipants(prev => [...prev]);

    // Log all current participants for debugging
    console.log("Current participants:");
    participants.forEach(p => {
      console.log(`- Participant: id=${p.id}, name=${p.name}, user.id=${p.user?.id}`);
    });

    // If we already have a video element for this user ID, set the stream
    if (participantRefs.current[userId]) {
      console.log(`Setting stream directly for existing video element with user ID: ${userId}`);
      participantRefs.current[userId].srcObject = stream;
    }

    // Find the participant in our list by user.id
    // This is critical because the WebRTC connection uses user.id
    const participant = participants.find(p => p.user && p.user.id === parseInt(userId));

    if (participant) {
      console.log(`Found participant in existing list: ${participant.name} (participant ID: ${participant.id}, user ID: ${participant.user.id})`);

      // Store the stream reference by both user.id and participant.id
      participantRefs.current[`stream_${userId}`] = stream;
      participantRefs.current[`stream_${participant.id}`] = stream;

      // Check if we have a video element for this participant ID
      if (participantRefs.current[participant.id]) {
        console.log(`Setting stream for existing video element with participant ID: ${participant.id}`);
        participantRefs.current[participant.id].srcObject = stream;
      }

      // Even if we've set the stream, force a re-render to ensure the video element is updated
      // This helps when the video element exists but the stream isn't being displayed
      console.log(`Forcing re-render to ensure video element is updated for participant: ${participant.name}`);
      setParticipants(prev => [...prev]);

      // Ensure the stream is set after the re-render
      setTimeout(() => {
        console.log(`Checking for video elements after re-render for user ID: ${userId} and participant ID: ${participant.id}`);

        // Try to set the stream for both the user ID and participant ID
        if (participantRefs.current[userId]) {
          console.log(`Setting stream for video element with user ID: ${userId}`);
          participantRefs.current[userId].srcObject = stream;
        }

        if (participantRefs.current[participant.id]) {
          console.log(`Setting stream for video element with participant ID: ${participant.id}`);
          participantRefs.current[participant.id].srcObject = stream;
        }
      }, 300); // Increased timeout to ensure render completes

      return;
    }

    // If we couldn't find the participant by exact user ID, try with string/number conversion
    // WebRTC might be using string IDs while the API returns numbers
    const participantWithStringId = participants.find(p =>
      p.user && (p.user.id === userId || p.user.id === parseInt(userId) || p.user.id.toString() === userId.toString())
    );

    if (participantWithStringId) {
      console.log(`Found participant with string/number conversion: ${participantWithStringId.name}`);

      // Store the stream reference by both user.id and participant.id
      participantRefs.current[`stream_${userId}`] = stream;
      participantRefs.current[`stream_${participantWithStringId.id}`] = stream;
      participantRefs.current[`stream_${participantWithStringId.user.id}`] = stream;

      // Check if we have a video element for this participant ID
      if (participantRefs.current[participantWithStringId.id]) {
        console.log(`Setting stream for existing video element with participant ID: ${participantWithStringId.id}`);
        participantRefs.current[participantWithStringId.id].srcObject = stream;
      }

      // Force a re-render to ensure the video element is updated
      setParticipants(prev => [...prev]);

      return;
    }

    // If we still couldn't find the participant, try to find by elimination
    // This is useful when there are multiple participants and we need to match by process of elimination
    if (participants.length > 2) {
      console.log(`Trying to find participant by elimination among ${participants.length} participants`);

      // Get all participants except the current user
      const otherParticipants = participants.filter(p =>
        p.id !== currentUser.id &&
        (!p.user || p.user.id !== currentUser.id)
      );

      // Find participants that don't already have a stream
      const participantsWithoutStream = otherParticipants.filter(p => {
        const hasStreamById = !!participantRefs.current[`stream_${p.id}`];
        const hasStreamByUserId = p.user && !!participantRefs.current[`stream_${p.user.id}`];
        return !hasStreamById && !hasStreamByUserId;
      });

      if (participantsWithoutStream.length === 1) {
        const matchedParticipant = participantsWithoutStream[0];
        console.log(`Found participant by elimination: ${matchedParticipant.name} (ID: ${matchedParticipant.id})`);

        // Store the stream reference by both the original user ID and the matched participant ID
        participantRefs.current[`stream_${userId}`] = stream;
        participantRefs.current[`stream_${matchedParticipant.id}`] = stream;

        // If the matched participant has a user ID, store by that too
        if (matchedParticipant.user?.id) {
          participantRefs.current[`stream_${matchedParticipant.user.id}`] = stream;
        }

        // Force a re-render to ensure the video element is updated
        setParticipants(prev => [...prev]);

        return;
      } else {
        console.log(`Could not find a unique participant without stream: found ${participantsWithoutStream.length}`);
      }
    }

    // If we get here, we couldn't find the participant in our current list
    console.log(`Participant with user ID ${userId} not found in list, fetching updated participant list`);

    // Refresh the participant list from the server
    meetingService.getMeetingParticipants(meetingCode)
      .then(updatedParticipants => {
        console.log("Updated participants list from server:");
        updatedParticipants.forEach(p => {
          console.log(`- Participant: id=${p.id}, name=${p.name}, user.id=${p.user?.id}`);
        });

        // Update our participants state
        setParticipants(updatedParticipants);

        // Try to find the participant in the updated list with various ID formats
        const foundParticipant = updatedParticipants.find(p =>
          p.user && (
            p.user.id === userId ||
            p.user.id === parseInt(userId) ||
            p.user.id.toString() === userId.toString()
          )
        );

        if (foundParticipant) {
          console.log(`Found participant in updated list: ${foundParticipant.name} (participant ID: ${foundParticipant.id}, user ID: ${foundParticipant.user.id})`);

          // Store the stream reference by both user.id and participant.id
          participantRefs.current[`stream_${userId}`] = stream;
          participantRefs.current[`stream_${foundParticipant.id}`] = stream;
          participantRefs.current[`stream_${foundParticipant.user.id}`] = stream;

          // Wait for the re-render to complete, then set the stream
          setTimeout(() => {
            console.log(`Checking for video elements after participant list update for user ID: ${userId} and participant ID: ${foundParticipant.id}`);

            // Check for video elements by both IDs
            if (participantRefs.current[foundParticipant.id]) {
              console.log(`Setting stream for video element with participant ID: ${foundParticipant.id}`);
              participantRefs.current[foundParticipant.id].srcObject = stream;
            }

            if (participantRefs.current[userId]) {
              console.log(`Setting stream for video element with user ID: ${userId}`);
              participantRefs.current[userId].srcObject = stream;
            }

            if (participantRefs.current[foundParticipant.user.id]) {
              console.log(`Setting stream for video element with user ID: ${foundParticipant.user.id}`);
              participantRefs.current[foundParticipant.user.id].srcObject = stream;
            }
          }, 300); // Longer timeout to ensure render completes
        } else {
          // If we still can't find by ID, try to find by elimination in the updated list
          const otherParticipants = updatedParticipants.filter(p =>
            p.id !== currentUser.id &&
            (!p.user || p.user.id !== currentUser.id)
          );

          const participantsWithoutStream = otherParticipants.filter(p => {
            const hasStreamById = !!participantRefs.current[`stream_${p.id}`];
            const hasStreamByUserId = p.user && !!participantRefs.current[`stream_${p.user.id}`];
            return !hasStreamById && !hasStreamByUserId;
          });

          if (participantsWithoutStream.length === 1) {
            const matchedParticipant = participantsWithoutStream[0];
            console.log(`Found participant by elimination after update: ${matchedParticipant.name}`);

            // Store the stream reference
            participantRefs.current[`stream_${userId}`] = stream;
            participantRefs.current[`stream_${matchedParticipant.id}`] = stream;
            if (matchedParticipant.user?.id) {
              participantRefs.current[`stream_${matchedParticipant.user.id}`] = stream;
            }

            // Force another re-render
            setParticipants(prev => [...prev]);
          } else {
            console.warn(`Could not find participant with user ID: ${userId} even after updating participant list`);
          }
        }
      })
      .catch(err => {
        console.error(`Error fetching participants for user ID ${userId}:`, err);
      });
  }

  // Handle message received
  const handleMessageReceived = (message) => {
    setChatMessages((prev) => [...prev, message])

    // Scroll to bottom of chat
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  // Handle file received
  const handleFileReceived = (fileData) => {
    // Add to received files list
    setReceivedFiles(prev => [...prev, fileData])

    // Add system message about received file
    const fileMessage = {
      id: Date.now(),
      senderId: fileData.senderId,
      senderName: fileData.senderName,
      text: `Sent a file: ${fileData.fileName} (${(fileData.fileSize / 1024).toFixed(2)} KB)`,
      timestamp: fileData.timestamp,
      type: "file",
      fileData: fileData
    }

    setChatMessages(prev => [...prev, fileMessage])

    // Scroll to bottom of chat
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  // Handle participant audio toggle
  const handleParticipantAudioToggle = (userId, enabled) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === userId
          ? { ...p, audioEnabled: enabled }
          : p
      )
    )
  }

  // Handle participant video toggle
  const handleParticipantVideoToggle = (userId, enabled) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === userId
          ? { ...p, videoEnabled: enabled }
          : p
      )
    )
  }

  // Handle WebRTC error
  const handleWebRTCError = (error) => {
    console.error("WebRTC error:", error)
    
    // Hiển thị thông báo lỗi cụ thể nếu có
    let errorMessage = "Lỗi kết nối. Vui lòng thử tham gia lại cuộc họp.";
    
    if (error && error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    
    // Hiển thị thông báo hệ thống trong cuộc họp để người dùng biết
    addSystemMessage(`Lỗi: ${errorMessage}`);
  }

  // Add system message to chat
  const addSystemMessage = (text) => {
    const systemMessage = {
      id: Date.now(),
      senderId: "system",
      senderName: "System",
      text,
      timestamp: new Date().toISOString(),
      type: "system",
    }

    setChatMessages((prev) => [...prev, systemMessage])
  }

  // Toggle audio
  const toggleAudio = () => {
    webrtcService.toggleAudio(!audioEnabled)
    setAudioEnabled(!audioEnabled)
  }

  // Toggle video
  const toggleVideo = () => {
    webrtcService.toggleVideo(!videoEnabled)
    setVideoEnabled(!videoEnabled)
  }

  // Toggle screen sharing
  const toggleScreenSharing = async () => {
    try {
      if (isScreenSharing) {
        await webrtcService.stopScreenSharing()
        setIsScreenSharing(false)
      } else {
        const screenStream = await webrtcService.shareScreen()
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream
        }
        setIsScreenSharing(true)
      }
    } catch (err) {
      console.error("Error toggling screen sharing:", err)
      setError("Failed to share screen. Please try again.")
    }
  }

  // Leave meeting
  const leaveMeeting = async () => {
    try {
      console.log("User explicitly leaving meeting - cleaning up WebRTC connection");

      // Gọi API REST để xóa người dùng khỏi phòng họp
      try {
        await meetingService.removeParticipantSelf(meetingCode, currentUser.id);
        console.log("Successfully removed user from meeting via REST API");
      } catch (apiErr) {
        console.error("Error calling leave meeting API:", apiErr);
        // Tiếp tục thực hiện các bước tiếp theo ngay cả khi API gặp lỗi
      }

      // Explicitly send leave message and clean up resources
      webrtcService.leaveMeeting(true);

      if (isHost) {
        await meetingService.endMeeting(meetingCode);
      }

      // Navigate with replace to avoid history issues
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error leaving meeting:", err);
    }
  }

  // Send chat message
  const sendMessage = (e) => {
    e.preventDefault()

    if (!messageInput.trim()) return

    const message = {
      id: Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name || currentUser.fullName || "You",
      text: messageInput,
      timestamp: new Date().toISOString(),
      type: "user",
    }

    // Gửi tin nhắn qua WebSocket
    webrtcService.sendMessage(message)
    
    // Không thêm tin nhắn vào danh sách ở đây nữa
    // Tin nhắn sẽ được thêm vào khi nhận được từ WebSocket
    
    setMessageInput("")

    // Scroll to bottom of chat
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  // Handle file upload button click
  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle file selection for upload
  const handleFileSelected = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setFileUploading(true)

      // Add system message about file being uploaded
      addSystemMessage(`Uploading file: ${file.name}`)

      // Upload the file
      await webrtcService.sendFile(file, {
        senderName: currentUser.name
      })

      // Add system message about file upload completed
      addSystemMessage(`File uploaded successfully: ${file.name}`)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      console.error("Error uploading file:", err)
      addSystemMessage(`Failed to upload file: ${file.name}`)
    } finally {
      setFileUploading(false)
    }
  }

  // Download a received file
  const downloadFile = (fileData) => {
    webrtcService.downloadFile(fileData)
  }

  // Remove participant (host only)
  const removeParticipant = async (participantId) => {
    try {
      await meetingService.removeParticipant(meetingCode, participantId)

      // Update participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingCode)
      setParticipants(participantsData)

      // Add system message to chat
      const participant = participants.find((p) => p.id === participantId)
      if (participant) {
        addSystemMessage(`${participant.name} was removed from the meeting`)
      }
    } catch (err) {
      console.error("Error removing participant:", err)
    }
  }

  // Update participant permissions (host only)
  const updateParticipantPermissions = async (participantId, permissions) => {
    try {
      await meetingService.updateParticipantPermissions(meetingCode, participantId, permissions)

      // Update participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingCode)
      setParticipants(participantsData)
    } catch (err) {
      console.error("Error updating participant permissions:", err)
    }
  }

  // Copy meeting link
  const copyMeetingLink = () => {
    const link = `${window.location.origin}/join?code=${meeting.meetingCode}`
    navigator.clipboard.writeText(link)

    // Show toast or notification
    addSystemMessage("Meeting link copied to clipboard")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-6 z-50">
        <div className="bg-card shadow-lg rounded-lg max-w-md w-full p-6 border">
          <div className="flex items-center gap-3 mb-4 text-red-500">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Lỗi kết nối</h2>
          </div>
          
          <p className="mb-6 text-card-foreground">{error}</p>
          
          <div className="flex flex-col md:flex-row gap-3 justify-end">
            <button
              className="px-4 py-2 rounded-md flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setError(null); 
                setIsLoading(true);
                initializeWebRTC().then(() => {
                  setIsLoading(false);
                }).catch(err => {
                  console.error("Error reinitializing WebRTC:", err);
                  setIsLoading(false);
                  handleWebRTCError(err);
                });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
            
            <button
              className="px-4 py-2 rounded-md flex items-center justify-center gap-2 bg-red-500 text-white hover:bg-red-600"
              onClick={() => navigate("/", { replace: true })}
            >
              <X className="h-4 w-4" />
              Quay lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Hidden video element for WebRTC initialization */}
      <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />

      {/* Meeting header */}
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="font-semibold">{meeting?.title || "Meeting"}</h1>
          <p className="text-sm text-muted-foreground">Meeting ID: {meeting?.meetingCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyMeetingLink} className="btn btn-ghost p-2" title="Copy meeting link">
            <Share2 size={18} />
          </button>
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className={`btn btn-ghost p-2 ${isParticipantsOpen ? "bg-accent" : ""}`}
            title="Participants"
          >
            <UsersIcon size={18} />
            <span className="ml-1">{participants.length}</span>
          </button>
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`btn btn-ghost p-2 ${isChatOpen ? "bg-accent" : ""}`}
            title="Chat"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* All participant videos (including current user) */}
            {participants.map((participant) => {
              // Get the user ID from the participant object
              const participantUserId = participant.user?.id;

              // Check if this is the current user by comparing ONLY user.id
              const isCurrentUser = participantUserId && participantUserId === currentUser.id;

              // Check for streams by user.id (preferred) and from webrtcService
              const hasStreamFromWebRTC = participantUserId && !!webrtcService.remoteStreams[participantUserId];
              const hasStreamByUserId = participantUserId && !!participantRefs.current[`stream_${participantUserId}`];

              console.log(`Rendering participant: ${participant.name}, id=${participant.id}, userId=${participantUserId}, isCurrentUser=${isCurrentUser}, hasStreamFromWebRTC=${hasStreamFromWebRTC}, hasStreamByUserId=${hasStreamByUserId}`);

              return (
                <div key={participant.id} className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={(el) => {
                      if (!el) return;

                      // For current user, use the local video stream
                      if (isCurrentUser) {
                        console.log(`Setting up current user's video element (user ID: ${participantUserId})`);

                        // Try multiple sources for the stream in order of preference
                        if (webrtcService.localStream) {
                          console.log("Using stream from webrtcService.localStream");
                          el.srcObject = webrtcService.localStream;
                        } else if (participantRefs.current[`stream_${currentUser.id}`]) {
                          console.log(`Using stream from participantRefs by current user ID: ${currentUser.id}`);
                          el.srcObject = participantRefs.current[`stream_${currentUser.id}`];
                        } else if (participantUserId && participantRefs.current[`stream_${participantUserId}`]) {
                          console.log(`Using stream from participantRefs by user ID: ${participantUserId}`);
                          el.srcObject = participantRefs.current[`stream_${participantUserId}`];
                        } else if (localVideoRef.current && localVideoRef.current.srcObject) {
                          console.log("Using stream from localVideoRef");
                          el.srcObject = localVideoRef.current.srcObject;
                        } else {
                          console.log("No stream found for current user, will try to get user media");
                          // Try to get user media directly if no stream is available
                          navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                            .then(stream => {
                              console.log("Got user media directly");
                              el.srcObject = stream;

                              // Store for future use in all possible references
                              if (!webrtcService.localStream) {
                                webrtcService.localStream = stream;
                              }

                              // Store in participant refs for consistency - prioritize user.id
                              participantRefs.current[`stream_${currentUser.id}`] = stream;
                              if (participantUserId) {
                                participantRefs.current[`stream_${participantUserId}`] = stream;
                              }
                            })
                            .catch(err => console.error("Failed to get user media directly:", err));
                        }

                        // Store the element reference - prioritize user.id
                        if (participantUserId) {
                          participantRefs.current[participantUserId] = el;
                        }
                        return;
                      }

                      // For other participants, use the remote stream
                      // Store the reference by user ID (preferred) and participant ID (fallback)
                      if (participantUserId) {
                        participantRefs.current[participantUserId] = el;
                      }
                      participantRefs.current[participant.id] = el;

                      console.log(`Setting up video element for participant: ${participant.name} (user ID: ${participantUserId})`);

                      // Check stream references for this participant - prioritize webrtcService.remoteStreams
                      const streamFromWebRTC = participantUserId ? webrtcService.remoteStreams[participantUserId] : null;
                      const streamByUserId = participantUserId ? participantRefs.current[`stream_${participantUserId}`] : null;
                      const streamByParticipantId = participantRefs.current[`stream_${participant.id}`];

                      // If we already have a stream for this participant, set it
                      // Prioritize the webrtcService.remoteStreams as that's the most direct source
                      if (streamFromWebRTC) {
                        console.log(`Setting stream from webrtcService.remoteStreams for: ${participant.name}`);
                        el.srcObject = streamFromWebRTC;

                        // Also store in our local refs for consistency
                        participantRefs.current[`stream_${participantUserId}`] = streamFromWebRTC;
                      } else if (streamByUserId) {
                        console.log(`Setting stream by user ID for: ${participant.name}`);
                        el.srcObject = streamByUserId;
                      } else if (streamByParticipantId) {
                        console.log(`Setting stream by participant ID for: ${participant.name}`);
                        el.srcObject = streamByParticipantId;
                      } else if (!isCurrentUser) {
                        // For non-current users, try to find a stream by elimination
                        // First, identify all streams that are already assigned to other participants
                        const assignedStreamKeys = new Set();
                        participants.forEach(p => {
                          if (p.id !== participant.id && p.id !== currentUser.id) {
                            // Check if this participant already has a stream assigned
                            const pUserId = p.user?.id;
                            if (participantRefs.current[p.id]?.srcObject) {
                              const stream = participantRefs.current[p.id].srcObject;
                              if (stream.userId) assignedStreamKeys.add(stream.userId);
                            }
                            if (pUserId && participantRefs.current[pUserId]?.srcObject) {
                              const stream = participantRefs.current[pUserId].srcObject;
                              if (stream.userId) assignedStreamKeys.add(stream.userId);
                            }
                          }
                        });

                        // Get all available streams for matching
                        const allStreams = {};
                        Object.keys(participantRefs.current).forEach(key => {
                          if (key.startsWith('stream_')) {
                            const streamKey = key.replace('stream_', '');
                            allStreams[streamKey] = participantRefs.current[key];
                          }
                        });

                        // Find unassigned streams
                        const unassignedStreams = [];
                        Object.keys(allStreams).forEach(key => {
                          const stream = allStreams[key];
                          // Check if this stream is already assigned to another participant
                          const streamUserId = stream.userId || stream.remoteUserId;

                          if (!assignedStreamKeys.has(key) &&
                              key !== currentUser.id.toString() &&
                              (!streamUserId || !assignedStreamKeys.has(streamUserId.toString()))) {
                            unassignedStreams.push({
                              key: key,
                              stream: stream,
                              userId: streamUserId
                            });
                          }
                        });

                        console.log(`Found ${unassignedStreams.length} unassigned streams for ${participant.name}`);

                        // If there's exactly one unassigned stream, use it for this participant
                        if (unassignedStreams.length === 1) {
                          console.log(`Using unassigned stream for: ${participant.name} (stream key: ${unassignedStreams[0].key})`);
                          el.srcObject = unassignedStreams[0].stream;

                          // Store this stream with the correct keys for future reference
                          participantRefs.current[`stream_${participant.id}`] = unassignedStreams[0].stream;
                          if (participantUserId) {
                            participantRefs.current[`stream_${participantUserId}`] = unassignedStreams[0].stream;
                          }
                        } else if (unassignedStreams.length > 1) {
                          // If there are multiple unassigned streams, try to match by user ID
                          // This can happen when multiple participants join at once
                          const matchedStream = unassignedStreams.find(s => {
                            // Try to match by user ID (string/number conversion)
                            if (participantUserId) {
                              // First check the stream's userId property (most reliable)
                              if (s.userId && (
                                  s.userId.toString() === participantUserId.toString() ||
                                  parseInt(s.userId) === parseInt(participantUserId)
                                )) {
                                return true;
                              }

                              // Then check the key
                              return s.key === participantUserId.toString() ||
                                     s.key === parseInt(participantUserId).toString();
                            }
                            return false;
                          });

                          if (matchedStream) {
                            console.log(`Found matching stream by user ID for: ${participant.name}`);
                            el.srcObject = matchedStream.stream;

                            // Store for future reference
                            participantRefs.current[`stream_${participant.id}`] = matchedStream.stream;
                            if (participantUserId) {
                              participantRefs.current[`stream_${participantUserId}`] = matchedStream.stream;
                            }
                          } else {
                            // If no match by user ID, just use the first unassigned stream
                            console.log(`Using first unassigned stream for: ${participant.name}`);
                            el.srcObject = unassignedStreams[0].stream;

                            // Store for future reference
                            participantRefs.current[`stream_${participant.id}`] = unassignedStreams[0].stream;
                            if (participantUserId) {
                              participantRefs.current[`stream_${participantUserId}`] = unassignedStreams[0].stream;
                            }
                          }
                        } else {
                          console.log(`No unassigned streams found for participant: ${participant.name}, will check again in 500ms`);

                          // If no stream is found, try again after a short delay
                          setTimeout(() => {
                            // Check all possible stream references again
                            const delayedStreamByUserId = participantUserId ? participantRefs.current[`stream_${participantUserId}`] : null;
                            const delayedStreamByParticipantId = participantRefs.current[`stream_${participant.id}`];

                            // Get all available streams again
                            const delayedAllStreams = {};
                            Object.keys(participantRefs.current).forEach(key => {
                              if (key.startsWith('stream_')) {
                                const streamKey = key.replace('stream_', '');
                                delayedAllStreams[streamKey] = participantRefs.current[key];
                              }
                            });

                            // Try to find an unassigned stream again
                            const delayedUnassignedStreams = [];
                            Object.keys(delayedAllStreams).forEach(key => {
                              const stream = delayedAllStreams[key];
                              // Check if this stream is already assigned to another participant
                              const streamUserId = stream.userId || stream.remoteUserId;

                              if (!assignedStreamKeys.has(key) &&
                                  key !== currentUser.id.toString() &&
                                  (!streamUserId || !assignedStreamKeys.has(streamUserId.toString()))) {
                                delayedUnassignedStreams.push({
                                  key: key,
                                  stream: stream,
                                  userId: streamUserId
                                });
                              }
                            });

                            // First check if we have a stream from webrtcService.remoteStreams
                            const streamFromWebRTC = participantUserId ? webrtcService.remoteStreams[participantUserId] : null;

                            if (streamFromWebRTC) {
                              console.log(`Setting delayed stream from webrtcService.remoteStreams for: ${participant.name}`);
                              el.srcObject = streamFromWebRTC;

                              // Also store in our local refs for consistency
                              participantRefs.current[`stream_${participantUserId}`] = streamFromWebRTC;
                            } else if (delayedStreamByUserId) {
                              console.log(`Setting delayed stream by user ID for: ${participant.name}`);
                              el.srcObject = delayedStreamByUserId;
                            } else if (delayedStreamByParticipantId) {
                              console.log(`Setting delayed stream by participant ID for: ${participant.name}`);
                              el.srcObject = delayedStreamByParticipantId;
                            } else if (delayedUnassignedStreams.length > 0) {
                              console.log(`Using delayed unassigned stream for: ${participant.name}`);
                              el.srcObject = delayedUnassignedStreams[0].stream;

                              // Store for future reference
                              participantRefs.current[`stream_${participant.id}`] = delayedUnassignedStreams[0].stream;
                              if (participantUserId) {
                                participantRefs.current[`stream_${participantUserId}`] = delayedUnassignedStreams[0].stream;
                              }
                            } else {
                              console.log(`Still no stream found for participant: ${participant.name} after delay, checking connection`);

                              // Try to restart the connection if needed
                              if (participantUserId) {
                                console.log(`Checking and potentially restarting connection for user ${participantUserId}`);
                                webrtcService.checkAndRestartConnection(participantUserId);
                              }
                            }
                          }, 500);
                        }
                      }
                    }}
                    id={`video-${participant.id}`}
                    autoPlay
                    muted={isCurrentUser} // Mute only the current user's video
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm font-medium">
                    {participant.name || "Unknown"} {isCurrentUser && "(You)"} {!participant.videoEnabled && "(Video off)"}
                  </div>
                </div>
              );
            })}

            {/* Screen share */}
            {isScreenSharing && (
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video col-span-full">
                <video ref={screenShareRef} autoPlay playsInline className="w-full h-full object-contain" />
                <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">Your screen</div>
              </div>
            )}
          </div>
        </div>

        {/* Participants sidebar */}
        {isParticipantsOpen && (
          <div className="w-80 border-l bg-background overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Participants ({participants.length})</h2>
              <button
                onClick={() => setIsParticipantsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {(participant.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {participant.name || "Unknown"}
                          {participant.id === currentUser.id && " (You)"}
                          {participant.id === meeting.hostId && " (Host)"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {participant.audioEnabled ? <Mic size={12} /> : <MicOff size={12} />}
                          {participant.videoEnabled ? <VideoIcon size={12} /> : <VideoOff size={12} />}
                        </div>
                      </div>
                    </div>
                    {isHost && participant.id !== currentUser.id && (
                      <div className="relative group">
                        <button className="text-muted-foreground hover:text-foreground">
                          <MoreVertical size={16} />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-10 hidden group-hover:block">
                          <div className="py-1">
                            <button
                              onClick={() =>
                                updateParticipantPermissions(participant.id, {
                                  audioEnabled: !participant.audioEnabled,
                                })
                              }
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent"
                            >
                              {participant.audioEnabled ? "Mute" : "Unmute"}
                            </button>
                            <button
                              onClick={() =>
                                updateParticipantPermissions(participant.id, {
                                  videoEnabled: !participant.videoEnabled,
                                })
                              }
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent"
                            >
                              {participant.videoEnabled ? "Disable video" : "Enable video"}
                            </button>
                            <button
                              onClick={() => removeParticipant(participant.id)}
                              className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent"
                            >
                              Remove from meeting
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {isHost && (
              <div className="p-4 border-t">
                <button
                  onClick={() => {
                    /* Show invite dialog */
                  }}
                  className="btn btn-outline w-full flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} />
                  Invite People
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat sidebar */}
        {isChatOpen && (
          <div className="w-80 border-l bg-background overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Chat</h2>
              <button onClick={() => setIsChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">No messages yet</p>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`${
                        message.type === "system"
                          ? "text-center text-xs text-muted-foreground"
                          : message.senderId === currentUser.id
                            ? "flex flex-col items-end"
                            : "flex flex-col items-start"
                      }`}
                    >
                      {message.type !== "system" && (
                        <p className="text-xs text-muted-foreground">
                          {message.senderName}
                        </p>
                      )}
                      <div
                        className={`${
                          message.type === "system"
                            ? "bg-muted text-muted-foreground py-1 px-3 rounded-full text-xs"
                            : message.senderId === currentUser.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                        } py-2 px-3 rounded-lg max-w-[85%]`}
                      >
                        {message.type === "file" ? (
                          <div className="flex items-center gap-2">
                            <FileText size={16} />
                            <span className="text-sm">{message.text}</span>
                            <button
                              onClick={() => downloadFile(message.fileData)}
                              className="p-1 hover:bg-background/20 rounded"
                              title="Download file"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm">{message.text}</p>
                        )}
                      </div>
                      {message.type !== "system" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-4 border-t">
              <form onSubmit={sendMessage} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleFileUploadClick}
                    className="btn btn-outline p-2"
                    disabled={fileUploading}
                    title="Attach file"
                  >
                    {fileUploading ? (
                      <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                    ) : (
                      <Paperclip size={18} />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <button type="submit" className="btn btn-primary p-2" disabled={!messageInput.trim()}>
                    <Send size={18} />
                  </button>
                </div>
                {fileUploading && (
                  <p className="text-xs text-muted-foreground">Uploading file...</p>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Meeting controls */}
      <footer className="bg-background border-t p-4 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleAudio}
            className={`btn ${audioEnabled ? "btn-ghost" : "btn-destructive"} rounded-full p-3`}
            title={audioEnabled ? "Mute" : "Unmute"}
          >
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={toggleVideo}
            className={`btn ${videoEnabled ? "btn-ghost" : "btn-destructive"} rounded-full p-3`}
            title={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? <VideoIcon size={20} /> : <VideoOff size={20} />}
          </button>
          <button
            onClick={toggleScreenSharing}
            className={`btn ${isScreenSharing ? "btn-primary" : "btn-ghost"} rounded-full p-3`}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            <ScreenShare size={20} />
          </button>
          <button
            onClick={leaveMeeting}
            className="btn btn-destructive rounded-full px-4 py-2 flex items-center gap-2"
            title="Leave meeting"
          >
            <PhoneOff size={18} />
            <span>Leave</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default MeetingRoom