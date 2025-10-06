"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile, type UserProfile } from "@/lib/game-service"
import { getRankByScore, getXPProgress } from "@/lib/rank-system"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EditProfileModal } from "./edit-profile-modal"

export function ProfileDropdown() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setProfile)
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  if (!user) return null

  const currentRank = profile ? getRankByScore(profile.bestScore) : getRankByScore(0)
  const levelProgress = profile ? getXPProgress(profile.totalXP) : getXPProgress(0)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/10 transition-colors"
      >
        <Avatar className="w-8 h-8 border-2 animate-pulse border-primary">
          <AvatarImage src={profile?.profilePictureURL || user.photoURL || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {(user.displayName || user.email || "U")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline text-sm font-medium">{user.displayName || user.email}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#0a0a0a] border border-primary/30 rounded-lg shadow-2xl shadow-primary/20 overflow-hidden z-50">
          {/* Profile Header */}
          <div className="p-4 border-b border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-12 h-12 border-2 animate-pulse border-muted-foreground">
                <AvatarImage src={profile?.profilePictureURL || user.photoURL || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-muted-foreground">{user.displayName || user.email}</div>
                <div className="text-xs animate-pulse font-semibold truncate" style={{ color: currentRank.color }}>
                  {currentRank.icon} {currentRank.name}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Level {levelProgress.level}</span>
                <span className="text-muted-foreground font-semibold">
                  {levelProgress.current.toLocaleString()} / {levelProgress.next.toLocaleString()} XP
                </span>
              </div>
              <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{ width: `${Math.min(levelProgress.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {(levelProgress.next - levelProgress.current).toLocaleString()} XP дутуу Level {levelProgress.level + 1}{" "}
                болох
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 grid grid-cols-2 gap-3 border-b border-primary/20">
            <div className="bg-secondary/5 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Best Score</div>
              <div className="text-lg font-bold animate-pulse text-muted-foreground">{profile?.bestScore.toLocaleString() || 0}</div>
            </div>
            <div className="bg-secondary/5 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Мөр</div>
              <div className="text-lg font-bold text-muted-foreground">{profile?.totalLines.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => {
                setShowEditModal(true)
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 bg-secondary/5 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <span className="text-muted-foreground text-sm font-medium">Мэдээлэл засах</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-red-500">Гарах</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={user}
          profile={profile}
          onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
        />
      )}
    </div>
  )
}
