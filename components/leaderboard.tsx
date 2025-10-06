"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getLeaderboard, type LeaderboardEntry } from "@/lib/game-service"
import { X } from "lucide-react"

interface LeaderboardProps {
  onClose: () => void
}

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      const data = await getLeaderboard(20)
      setScores(data)
      setLoading(false)
    }
    fetchLeaderboard()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Тэргүүлэгчид</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white touch-manipulation pointer-events-auto"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-400 py-8">Ачааллаж байна...</div>
        ) : scores.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">Оноо байхгүй байна</div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2 text-xs text-zinc-400 font-bold uppercase pb-2 border-b border-zinc-700">
              <div className="text-center">#</div>
              <div className="col-span-2">Нэр</div>
              <div className="text-right">Оноо</div>
              <div className="text-right">Мөр</div>
              <div className="text-right">Тоглоом</div>
            </div>
            {scores.map((entry, index) => (
              <div
                key={entry.id}
                className={`grid grid-cols-6 gap-2 text-sm py-3 px-2 rounded ${
                  index === 0
                    ? "bg-yellow-900/30 border border-yellow-700/50"
                    : index === 1
                      ? "bg-zinc-700/30 border border-zinc-600/50"
                      : index === 2
                        ? "bg-orange-900/30 border border-orange-700/50"
                        : "bg-zinc-800/30"
                }`}
              >
                <div className="text-center font-bold text-white">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                </div>
                <div className="col-span-2 text-white truncate">{entry.userName}</div>
                <div className="text-right text-white font-bold">{entry.bestScore.toLocaleString()}</div>
                <div className="text-right text-zinc-400">{entry.lines}</div>
                <div className="text-right text-zinc-400">{entry.totalGames}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
