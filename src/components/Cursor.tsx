import React from "react"

export function Cursor({ x, y, userId }: { x: number; y: number; userId: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        width: 10,
        height: 10,
        backgroundColor: "red",
        borderRadius: "50%"
      }}
      title={userId}
    />
  )
}
