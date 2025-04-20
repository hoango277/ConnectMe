"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, PaperclipIcon } from "lucide-react"
import { formatDistanceToNow } from "@/lib/utils"

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} senderId
 * @property {string} senderName
 * @property {string} content
 * @property {Date} timestamp
 */

/**
 * @param {Object} props
 * @param {Message[]} props.messages
 * @param {(content: string) => void} props.onSendMessage
 */
export default function ChatPanel({ messages, onSendMessage }) {
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      onSendMessage(newMessage)
      setNewMessage("")
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">Chat</h3>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col">
            <div className="flex items-start">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                {message.senderName.charAt(0)}
              </div>
              <div className="ml-2 flex-1">
                <div className="flex items-center">
                  <span className="font-medium text-gray-900 dark:text-white">{message.senderName}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(message.timestamp)}
                  </span>
                </div>
                <div className="mt-1 text-gray-700 dark:text-gray-300 break-words">{message.content}</div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Attach file">
            <PaperclipIcon className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" className="h-8 w-8">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
