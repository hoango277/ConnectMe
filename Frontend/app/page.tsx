import type { Metadata } from "next"
import MeetingRoom from "@/components/meeting-room"

export const metadata: Metadata = {
  title: "Online Meeting Platform",
  description: "Real-time meeting platform with chat and participant management",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MeetingRoom />
    </div>
  )
}
