"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getTopScores } from "@/lib/game-service"
import { getRankFromScore } from "@/lib/rank-system"

interface LeaderboardEntry {
  userId: string
  userName: string
  bestScore: number
  totalGames: number
  totalLines: number
}

interface LeaderboardProps {
  onClose: () => void
}

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const scores = await getTopScores(10)
        setLeaderboard(
          scores.map((entry: any) => ({
            userId: entry.userId,
            userName: entry.userName,
            bestScore: entry.bestScore,
            totalGames: entry.totalGames,
            totalLines: entry.totalLines ?? 0,
          }))
        )
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
      // ✅ Mobile дээр touch event ажиллуулах
      role="button"
      tabIndex={0}
      onTouchEnd={onClose}
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-zinc-900 border-zinc-700 max-h-[90vh] overflow-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              🏆 Тэргүүлэгчид
            </h2>

            <Button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              onTouchEnd={(e) => {
                e.stopPropagation()
                onClose()
              }}
              variant="outline"
              className="text-white border-zinc-700 hover:bg-zinc-800 bg-transparent z-[300] active:scale-95 transition-transform"
            >
              ✕
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-2xl animate-pulse">⏳</div>
              <div className="text-zinc-400 mt-2">Ачааллаж байна...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎮</div>
              <div className="text-zinc-400">Одоогоор тэргүүлэгч байхгүй байна</div>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const rank = getRankFromScore(entry.bestScore)
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-600"
                        : index === 1
                          ? "bg-gradient-to-r from-gray-700/30 to-gray-600/30 border-gray-500"
                          : index === 2
                            ? "bg-gradient-to-r from-orange-900/30 to-orange-800/30 border-orange-700"
                            : "bg-zinc-800/50 border-zinc-700"
                    }`}
                  >
                    <div className="text-2xl font-bold w-8 text-center">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                    </div>

                    <div className="flex-1">
                      <div className="font-bold text-white">{entry.userName}</div>
                      <div className="text-sm text-zinc-400">
                        <span className="font-semibold" style={{ color: rank.color }}>
                          {rank.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                        {entry.bestScore.toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-500">{entry.totalGames} тоглолт</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
