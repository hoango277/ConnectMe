"use client"

import { useEffect, useRef } from "react"
import type { User } from "@/lib/types"
import { Mic, MicOff, Video, VideoOff, MonitorSmartphone } from "lucide-react"

interface VideoGridProps {
  participants: User[]
}

export default function VideoGrid({ participants }: VideoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Adjust grid layout based on participant count
    if (!gridRef.current) return

    const count = participants.length
    let columns = 2

    if (count <= 1) {
      columns = 1
    } else if (count <= 4) {
      columns = 2
    } else if (count <= 9) {
      columns = 3
    } else {
      columns = 4
    }

    gridRef.current.style.gridTemplateColumns = `repeat(${columns}, 1fr)`
  }, [participants.length])

  return (
    <div ref={gridRef} className="grid gap-2 p-2 h-full bg-gray-900">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className={`relative rounded-lg overflow-hidden border-2 ${
            participant.isActive ? "border-blue-500" : "border-transparent"
          } ${participant.isScreenSharing ? "col-span-2 row-span-2" : ""}`}
        >
          {participant.isVideoOn ? (
            <div className="bg-gray-800 h-full w-full">
              <img
                src={`/placeholder.svg?height=300&width=400&text=${participant.name}`}
                alt={participant.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-gray-800 h-full w-full flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-white">
                {participant.name.charAt(0)}
              </div>
            </div>
          )}

          {/* Participant info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium truncate">
                {participant.name} {participant.role === "host" && "(Host)"}
              </span>
              <div className="flex items-center space-x-1">
                {participant.isMuted ? (
                  <MicOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Mic className="h-4 w-4 text-white" />
                )}

                {participant.isVideoOn ? (
                  <Video className="h-4 w-4 text-white" />
                ) : (
                  <VideoOff className="h-4 w-4 text-red-500" />
                )}

                {participant.isScreenSharing && <MonitorSmartphone className="h-4 w-4 text-blue-500" />}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
