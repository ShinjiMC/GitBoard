import { createCookieSessionStorage } from "@remix-run/node"

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secrets: ["your-secret"],
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true
  }
})

export const { getSession, commitSession, destroySession } = sessionStorage
