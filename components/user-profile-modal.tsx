"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getUserProfile, type UserProfile } from "@/lib/game-service"
import { getRankByScore, getRankByBattlePoints, getLevelFromXP } from "@/lib/rank-system"
import { Trophy, Target, Zap, Award, TrendingUp, Swords } from "lucide-react"

interface UserProfileModalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
}

export default function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile()
    }
  }, [isOpen, userId])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await getUserProfile(userId)
      setProfile(data)
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!profile && !loading) return null

  const soloRank = profile ? getRankByScore(profile.bestScore) : null
  const battleRank = profile ? getRankByBattlePoints(profile.battlePoints || 1000) : null
  const level = profile ? getLevelFromXP(profile.totalXP) : 1

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Тоглогчийн мэдээлэл</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold">
                {profile.userName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{profile.userName}</h3>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Zap className="w-4 h-4" />
                  Level {level}
                </div>
              </div>
            </div>

            {/* Ranks */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-lg border-2" style={{ borderColor: soloRank?.color }}>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5" style={{ color: soloRank?.color }} />
                  <span className="font-bold">Solo Rank</span>
                </div>
                <div className="text-xl font-bold" style={{ color: soloRank?.color }}>
                  {soloRank?.name}
                </div>
                <div className="text-sm text-zinc-400">{soloRank?.description}</div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg border-2" style={{ borderColor: battleRank?.color }}>
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="w-5 h-5" style={{ color: battleRank?.color }} />
                  <span className="font-bold">Battle Rank</span>
                </div>
                <div className="text-xl font-bold" style={{ color: battleRank?.color }}>
                  {battleRank?.name}
                </div>
                <div className="text-sm text-zinc-400">{profile.battlePoints || 1000} BP</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-yellow-400">
                  <Trophy className="w-5 h-5" />
                  <span className="font-bold">Best Score</span>
                </div>
                <div className="text-2xl font-bold">{profile.bestScore.toLocaleString()}</div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <Target className="w-5 h-5" />
                  <span className="font-bold">Total Games</span>
                </div>
                <div className="text-2xl font-bold">{profile.totalGames}</div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-green-400">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-bold">Total Lines</span>
                </div>
                <div className="text-2xl font-bold">{profile.totalLines}</div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-purple-400">
                  <Award className="w-5 h-5" />
                  <span className="font-bold">Battle Record</span>
                </div>
                <div className="text-2xl font-bold">
                  {profile.battleWins || 0}W - {profile.battleLosses || 0}L
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-400">Мэдээлэл олдсонгүй</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
