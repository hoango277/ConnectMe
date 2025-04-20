"use client"

import { useState, useEffect, useCallback } from "react"

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  const handleResize = useCallback(() => {
    const width = window.innerWidth
    setIsMobile(width < 768)
  }, [])

  useEffect(() => {
    // Set initial value
    handleResize()

    // Use ResizeObserver for more efficient resize detection
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(document.body)

    // Clean up
    return () => {
      resizeObserver.disconnect()
    }
  }, [handleResize])

  return isMobile
}
