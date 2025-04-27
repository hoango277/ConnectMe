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
} from "lucide-react"

const MeetingRoom = () => {
  const { meetingId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuth().currentUser
  console.log(currentUser);

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

    const initializeMeeting = async () => {
      try {
        // Fetch meeting details
        const meetingData = await meetingService.getMeeting(meetingId)
        console.log(meetingData);
        setMeeting(meetingData)
        setIsHost(meetingData.hostId === currentUser.id)

        // Initialize WebRTC
        await initializeWebRTC(meetingData)

        // Fetch participants
        const participantsData = await meetingService.getMeetingParticipants(meetingId)
        setParticipants(participantsData)

        if (participantsData.length > 0) {
          setActiveParticipant(participantsData[0].id)
        }
      } catch (err) {
        console.error("Error initializing meeting:", err)
        setError("Failed to join the meeting. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    initializeMeeting()

    // Cleanup function
    return () => {
      webrtcService.leaveMeeting()
    }
  }, [meetingId, currentUser.id])

  // Initialize WebRTC with SockJS/STOMP
  const initializeWebRTC = async (meetingData) => {
    try {
      // Get user media (camera and microphone)
      const stream = await webrtcService.getUserMedia({ video: true, audio: true })

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Initialize WebRTC service
      webrtcService.initialize(currentUser.id, meetingId)

      // Set up callbacks
      webrtcService.setCallbacks({
        onParticipantJoined: handleParticipantJoined,
        onParticipantLeft: handleParticipantLeft,
        onRemoteStreamAdded: handleRemoteStreamAdded,
        onMessageReceived: handleMessageReceived,
        onFileReceived: handleFileReceived,
        onParticipantAudioToggle: handleParticipantAudioToggle,
        onParticipantVideoToggle: handleParticipantVideoToggle,
        onError: handleWebRTCError,
      })
    } catch (err) {
      console.error("Error initializing WebRTC:", err)
      setError("Failed to access camera or microphone. Please check your permissions.")
    }
  }

  // Handle participant joined
  const handleParticipantJoined = async (data) => {
    try {
      // Fetch updated participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingId)
      setParticipants(participantsData)

      // Add system message to chat
      const participant = participantsData.find((p) => p.id === data.userId)
      if (participant) {
        addSystemMessage(`${participant.name} joined the meeting`)
      }
    } catch (err) {
      console.error("Error handling participant joined:", err)
    }
  }

  // Handle participant left
  const handleParticipantLeft = async (data) => {
    try {
      // Fetch updated participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingId)
      setParticipants(participantsData)

      // Add system message to chat
      const participant = participants.find((p) => p.id === data.userId)
      if (participant) {
        addSystemMessage(`${participant.name} left the meeting`)
      }

      // If active participant left, switch to another participant
      if (activeParticipant === data.userId) {
        if (participantsData.length > 0) {
          setActiveParticipant(participantsData[0].id)
        } else {
          setActiveParticipant(null)
        }
      }
    } catch (err) {
      console.error("Error handling participant left:", err)
    }
  }

  // Handle remote stream added
  const handleRemoteStreamAdded = (userId, stream) => {
    // Store the stream reference
    if (participantRefs.current[userId]) {
      participantRefs.current[userId].srcObject = stream
    }
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
    setError("Connection error. Please try rejoining the meeting.")
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
      webrtcService.leaveMeeting()

      if (isHost) {
        await meetingService.endMeeting(meetingId)
      }

      navigate("/")
    } catch (err) {
      console.error("Error leaving meeting:", err)
    }
  }

  // Send chat message
  const sendMessage = (e) => {
    e.preventDefault()

    if (!messageInput.trim()) return

    const message = {
      id: Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: messageInput,
      timestamp: new Date().toISOString(),
      type: "user",
    }

    webrtcService.sendMessage(message)
    setChatMessages((prev) => [...prev, message])
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
      await meetingService.removeParticipant(meetingId, participantId)

      // Update participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingId)
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
      await meetingService.updateParticipantPermissions(meetingId, participantId, permissions)

      // Update participants list
      const participantsData = await meetingService.getMeetingParticipants(meetingId)
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
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/")} className="btn btn-primary mt-4">
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
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
            {/* Local video */}
            <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
                You {!videoEnabled && "(Video off)"}
              </div>
            </div>

            {/* Participant videos */}
            {participants
              .filter((participant) => participant.id !== currentUser.id)
              .map((participant) => (
                <div key={participant.id} className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={(el) => (participantRefs.current[participant.id] = el)}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
                    {participant.name} {!participant.videoEnabled && "(Video off)"}
                  </div>
                </div>
              ))}

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
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {participant.name}
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
                          {message.senderId === currentUser.id ? "You" : message.senderName}
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
