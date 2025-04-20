// Simplified version of the toast hook
"use client"

import { useState, useCallback } from "react"

type ToastProps = {
  id?: string
  title: string
  description: string
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = useCallback(({ title, description }: ToastProps) => {
    const id = Date.now().toString()
    const newToast = { id, title, description }

    setToasts((prev) => [...prev, newToast])

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)

    return id
  }, [])

  return { toast, toasts }
}
