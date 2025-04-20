"use client"

import { Button } from "@/components/ui/button"
import { MoreVertical, Mic, MicOff, Video, VideoOff, UserPlus, Crown, Shield } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {"host" | "moderator" | "participant"} role
 * @property {boolean} isMuted
 * @property {boolean} isVideoOn
 * @property {boolean} isScreenSharing
 * @property {boolean} isActive
 */

/**
 * @param {Object} props
 * @param {User[]} props.participants
 * @param {string} props.currentUserId
 * @param {(userId: string, updates: Partial<User>) => void} props.onUpdateStatus
 * @param {(userId: string) => void} props.onRemoveParticipant
 */
export default function ParticipantsList({ participants, currentUserId, onUpdateStatus, onRemoveParticipant }) {
  const currentUser = participants.find((p) => p.id === currentUserId)
  const isHost = currentUser?.role === "host"

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-medium text-gray-900 dark:text-white">Participants ({participants.length})</h3>
        <Button size="sm" variant="outline" className="h-8">
          <UserPlus className="h-4 w-4 mr-1" />
          <span>Invite</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {participants.map((participant) => (
            <li key={participant.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                    {participant.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 dark:text-white">{participant.name}</span>
                      {participant.role === "host" && <Crown className="h-4 w-4 ml-1 text-yellow-500" />}
                      {participant.role === "moderator" && <Shield className="h-4 w-4 ml-1 text-blue-500" />}
                      {participant.id === currentUserId && (
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center mt-1">
                      {participant.isMuted ? (
                        <MicOff className="h-3 w-3 text-red-500" />
                      ) : (
                        <Mic className="h-3 w-3 text-green-500" />
                      )}
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        {participant.isMuted ? "Muted" : "Unmuted"}
                      </span>

                      <span className="mx-1 text-gray-300">•</span>

                      {participant.isVideoOn ? (
                        <Video className="h-3 w-3 text-green-500" />
                      ) : (
                        <VideoOff className="h-3 w-3 text-red-500" />
                      )}
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        {participant.isVideoOn ? "Video on" : "Video off"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions dropdown */}
                {(isHost || currentUserId === participant.id) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isHost && participant.id !== currentUserId && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onUpdateStatus(participant.id, { isMuted: !participant.isMuted })}
                          >
                            {participant.isMuted ? "Unmute" : "Mute"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdateStatus(participant.id, { isVideoOn: !participant.isVideoOn })}
                          >
                            {participant.isVideoOn ? "Disable video" : "Enable video"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(participant.id, {
                                role: participant.role === "moderator" ? "participant" : "moderator",
                              })
                            }
                          >
                            {participant.role === "moderator" ? "Remove moderator role" : "Make moderator"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500 focus:text-red-500"
                            onClick={() => onRemoveParticipant(participant.id)}
                          >
                            Remove from meeting
                          </DropdownMenuItem>
                        </>
                      )}

                      {currentUserId === participant.id && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onUpdateStatus(participant.id, { isMuted: !participant.isMuted })}
                          >
                            {participant.isMuted ? "Unmute myself" : "Mute myself"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdateStatus(participant.id, { isVideoOn: !participant.isVideoOn })}
                          >
                            {participant.isVideoOn ? "Turn off my video" : "Turn on my video"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
