"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import VideoGrid from "@/components/video-grid"
import ChatPanel from "@/components/chat-panel"
import ParticipantsList from "@/components/participants-list"
import FileSharing from "@/components/file-sharing"
import MeetingControls from "@/components/meeting-controls"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import type { User, Message, FileAttachment } from "@/lib/types"

export default function MeetingRoom() {
  const searchParams = useSearchParams()
  const meetingId = searchParams.get("id") || "demo-meeting"
  const username = searchParams.get("username") || "User"
  const { toast, toasts } = useToast()
  const isMobile = useMobile()

  const [activeTab, setActiveTab] = useState<string>("chat")
  const [participants, setParticipants] = useState<User[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [isConnected, setIsConnected] = useState<boolean>(false)

  // Mock data for demonstration
  useEffect(() => {
    // Simulate fetching participants
    setParticipants([
      { id: "1", name: "You", role: "host", isMuted: false, isVideoOn: true, isScreenSharing: false, isActive: true },
      {
        id: "2",
        name: "John Doe",
        role: "participant",
        isMuted: true,
        isVideoOn: true,
        isScreenSharing: false,
        isActive: false,
      },
      {
        id: "3",
        name: "Jane Smith",
        role: "participant",
        isMuted: false,
        isVideoOn: false,
        isScreenSharing: false,
        isActive: false,
      },
      {
        id: "4",
        name: "Alex Johnson",
        role: "participant",
        isMuted: true,
        isVideoOn: true,
        isScreenSharing: false,
        isActive: false,
      },
    ])

    // Simulate fetching chat history
    setMessages([
      {
        id: "1",
        senderId: "2",
        senderName: "John Doe",
        content: "Hello everyone!",
        timestamp: new Date(Date.now() - 300000),
      },
      {
        id: "2",
        senderId: "3",
        senderName: "Jane Smith",
        content: "Hi John, how are you?",
        timestamp: new Date(Date.now() - 240000),
      },
      {
        id: "3",
        senderId: "1",
        senderName: "You",
        content: "Welcome to the meeting!",
        timestamp: new Date(Date.now() - 180000),
      },
    ])

    // Simulate fetching shared files
    setFiles([
      {
        id: "1",
        name: "Meeting Agenda.pdf",
        size: 1240000,
        uploaderId: "1",
        uploaderName: "You",
        timestamp: new Date(Date.now() - 600000),
      },
      {
        id: "2",
        name: "Presentation.pptx",
        size: 3450000,
        uploaderId: "2",
        uploaderName: "John Doe",
        timestamp: new Date(Date.now() - 300000),
      },
    ])

    // Simulate WebSocket connection
    setTimeout(() => {
      setIsConnected(true)
      toast({
        title: "Connected to meeting",
        description: `You've joined meeting: ${meetingId}`,
      })
    }, 1000)

    // Simulate receiving a new message
    const messageInterval = setInterval(() => {
      const newMessage = {
        id: `msg-${Date.now()}`,
        senderId: "4",
        senderName: "Alex Johnson",
        content: "Is everyone seeing my screen?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])
    }, 15000)

    return () => {
      clearInterval(messageInterval)
    }
  }, [meetingId, toast])

  const sendMessage = (content: string) => {
    if (!content.trim()) return

    const newMessage = {
      id: `msg-${Date.now()}`,
      senderId: "1",
      senderName: "You",
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
  }

  const updateParticipantStatus = (userId: string, updates: Partial<User>) => {
    setParticipants((prev) => prev.map((p) => (p.id === userId ? { ...p, ...updates } : p)))
  }

  const removeParticipant = (userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== userId))
    toast({
      title: "Participant removed",
      description: `A participant has been removed from the meeting`,
    })
  }

  const uploadFile = (file: File) => {
    // Simulate file upload
    const newFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      uploaderId: "1",
      uploaderName: "You",
      timestamp: new Date(),
    }

    setFiles((prev) => [...prev, newFile])
    toast({
      title: "File uploaded",
      description: `${file.name} has been shared with all participants`,
    })
  }

  // Memoize the current user to avoid recalculating on every render
  const currentUser = useMemo(() => {
    return participants.find((p) => p.id === "1") || {
      id: "1",
      name: "You",
      role: "host",
      isMuted: false,
      isVideoOn: true,
      isScreenSharing: false,
      isActive: true,
    }
  }, [participants])

  // Memoize the toggle functions to prevent recreation on every render
  const handleToggleMute = useCallback(() => {
    updateParticipantStatus("1", { isMuted: !currentUser.isMuted })
  }, [currentUser.isMuted])

  const handleToggleVideo = useCallback(() => {
    updateParticipantStatus("1", { isVideoOn: !currentUser.isVideoOn })
  }, [currentUser.isVideoOn])

  const handleToggleScreenShare = useCallback(() => {
    updateParticipantStatus("1", { isScreenSharing: !currentUser.isScreenSharing })
  }, [currentUser.isScreenSharing])

  // Memoize the leave meeting function
  const handleLeaveMeeting = useCallback(() => {
    toast({
      title: "Left meeting",
      description: "You have left the meeting",
    })
  }, [toast])

  // Memoize the toggle side panel function
  const handleToggleSidePanel = useCallback(() => {
    if (isMobile) {
      setActiveTab(activeTab === "video" ? "chat" : "video")
    }
  }, [isMobile, activeTab])

  return (
    <div className="flex flex-col h-screen">
      {/* Meeting header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Meeting: {meetingId}</h1>
          <div className="flex items-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 overflow-hidden">
          <VideoGrid participants={participants} />
        </div>

        {/* Side panel */}
        {(!isMobile || (isMobile && activeTab !== "video")) && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col">
                <ChatPanel messages={messages} onSendMessage={sendMessage} />
              </TabsContent>

              <TabsContent value="participants" className="flex-1">
                <ParticipantsList
                  participants={participants}
                  currentUserId="1"
                  onUpdateStatus={updateParticipantStatus}
                  onRemoveParticipant={removeParticipant}
                />
              </TabsContent>

              <TabsContent value="files" className="flex-1">
                <FileSharing files={files} onUploadFile={uploadFile} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Meeting controls */}
      <MeetingControls
        isMuted={currentUser.isMuted}
        isVideoOn={currentUser.isVideoOn}
        isScreenSharing={currentUser.isScreenSharing}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveMeeting={handleLeaveMeeting}
        onToggleSidePanel={handleToggleSidePanel}
        isMobile={isMobile}
        sidebarOpen={!isMobile || (isMobile && activeTab !== "video")}
      />
    </div>
  )
}
