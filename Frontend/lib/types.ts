export interface User {
  id: string
  name: string
  role: "host" | "moderator" | "participant"
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing: boolean
  isActive: boolean
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

export interface FileAttachment {
  id: string
  name: string
  size: number
  uploaderId: string
  uploaderName: string
  timestamp: Date
}
