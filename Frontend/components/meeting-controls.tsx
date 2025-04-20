"use client"

import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, MonitorSmartphone, PhoneOff, Users, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MeetingControlsProps {
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onLeaveMeeting: () => void
  onToggleSidePanel: () => void
  isMobile: boolean
  sidebarOpen: boolean
}

export default function MeetingControls({
  isMuted,
  isVideoOn,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  onToggleSidePanel,
  isMobile,
  sidebarOpen,
}: MeetingControlsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleMute}
                variant={isMuted ? "outline" : "default"}
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleVideo}
                variant={isVideoOn ? "default" : "outline"}
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isVideoOn ? "Turn off camera" : "Turn on camera"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleScreenShare}
                variant={isScreenSharing ? "default" : "outline"}
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <MonitorSmartphone className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isScreenSharing ? "Stop sharing" : "Share screen"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isMobile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onToggleSidePanel} variant="outline" size="icon" className="h-10 w-10 rounded-full">
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sidebarOpen ? "Hide sidebar" : "Show sidebar"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onLeaveMeeting} variant="destructive" size="icon" className="h-10 w-10 rounded-full">
                <PhoneOff className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave meeting</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
