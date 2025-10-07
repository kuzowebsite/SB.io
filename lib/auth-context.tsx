"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { type User, onAuthStateChanged, signInAnonymously } from "firebase/auth"
import { auth, isFirebaseConfigured } from "./firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      console.log("[v0] Firebase not configured, skipping authentication")
      setError("Firebase тохиргоо хийгдээгүй байна")
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          try {
            console.log("[v0] Signing in anonymously...")
            const result = await signInAnonymously(auth)
            setUser(result.user)
            setError(null)
            console.log("[v0] Anonymous sign-in successful")
          } catch (error) {
            console.error("[v0] Error signing in anonymously:", error)
            setError("Нэвтрэх үед алдаа гарлаа")
            setUser(null)
          }
        } else {
          console.log("User authenticated:", user.uid)
          setUser(user)
          setError(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Auth state change error:", error)
        setError("Нэвтрэх үед алдаа гарлаа")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading, error }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
