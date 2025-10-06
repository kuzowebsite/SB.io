"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import {
  getTopScores,
  getTotalPlayers,
  getTotalGames,
  subscribeToOnlinePlayers,
  type LeaderboardEntry,
} from "@/lib/game-service"
import { getRankByScore, RANKS, type Rank } from "@/lib/rank-system"
import { ArrowLeft, AlertCircle } from "lucide-react"

export default function TetraChannelPage() {
  const [activeTab, setActiveTab] = useState<"home" | "leaderboards">("home")
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Буцах
              </Button>
              <Link href="/" className="text-2xl font-bold font-mono">
                <span className="text-primary">SB</span>
                <span className="text-black">.iO</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">SB CHANNEL</h1>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-border/50 bg-background/50">
          <div className="container mx-auto px-4">
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant={activeTab === "home" ? "default" : "ghost"}
                onClick={() => setActiveTab("home")}
                className="text-sm sm:text-base font-semibold"
              >
                RANK
              </Button>
              <Button
                variant={activeTab === "leaderboards" ? "default" : "ghost"}
                onClick={() => setActiveTab("leaderboards")}
                className="text-sm sm:text-base font-semibold"
              >
                LEADERBOARDS
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="container mx-auto px-4 py-8">
          {activeTab === "home" && <HomeTab />}
          {activeTab === "leaderboards" && <LeaderboardsTab />}
        </main>
      </div>
    </ProtectedRoute>
  )
}

function HomeTab() {
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [totalGames, setTotalGames] = useState(0)
  const [onlinePlayers, setOnlinePlayers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null)

  useEffect(() => {
    Promise.all([getTotalPlayers(), getTotalGames()])
      .then(([players, games]) => {
        setTotalPlayers(players)
        setTotalGames(games)
        setError(null)
      })
      .catch((err) => {
        console.error("Error loading home data:", err)
        setError("Өгөгдөл татахад алдаа гарлаа. Дахин оролдоно уу.")
      })
      .finally(() => setLoading(false))

    const unsubscribe = subscribeToOnlinePlayers((count) => {
      setOnlinePlayers(count)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <p className="text-muted-foreground text-center">{error}</p>
        <Button onClick={() => window.location.reload()}>Дахин оролдох</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold">Welcome to SB CHANNEL</h2>
        <p className="text-muted-foreground text-lg">
          Цолны дараалал, leaderboard болон бусад мэдээллийг харна уу
        </p>
      </div>

      {/* Rank System Info */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Цолны систем</h3>
        <p className="text-sm text-muted-foreground">
          Цол нь таны хамгийн өндөр оноогоор тодорхойлогдоно. Дарж дэлгэрэнгүй мэдээлэл үзнэ үү.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {RANKS.map((rank) => (
            <button
              key={rank.id}
              onClick={() => setSelectedRank(rank)}
              className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-all hover:scale-105 text-left"
              style={{ borderColor: rank.color + "40" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{rank.icon}</span>
                <span className="font-bold text-xs" style={{ color: rank.color }}>
                  {rank.name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{rank.minScore.toLocaleString()} оноо</div>
            </button>
          ))}
        </div>
      </div>

      {selectedRank && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRank(null)}
        >
          <div
            className="bg-card border rounded-lg p-6 max-w-md w-full"
            style={{ borderColor: selectedRank.color }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{selectedRank.icon}</span>
              <div>
                <h3 className="text-xl font-bold" style={{ color: selectedRank.color }}>
                  {selectedRank.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRank.minScore.toLocaleString()} оноо шаардлагатай
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">{selectedRank.description}</p>
            <Button onClick={() => setSelectedRank(null)} className="w-full mt-4">
              Хаах
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function LeaderboardsTab() {
  const [scores, setScores] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTopScores(20)
      .then((data) => {
        setScores(data)
        setError(null)
      })
      .catch((err) => {
        console.error("[v0] Error loading scores:", err)
        setError("Leaderboard өгөгдөл татахад алдаа гарлаа. Интернэт холболтоо шалгана уу.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leaderboards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <p className="text-muted-foreground text-center">{error}</p>
        <Button onClick={() => window.location.reload()}>Дахин оролдох</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">RANK</h2>
        <p className="text-sm text-muted-foreground mt-1">Нэг тоглолтын хамгийн өндөр оноогоор эрэмблэгдсэн</p>
      </div>

      {scores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Одоогоор оноо байхгүй байна. Эхний тоглогч болоорой!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((entry, index) => {
            const rank = getRankByScore(entry.bestScore)
            return (
              <div
                key={entry.id}
                className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                style={{ borderColor: rank.color + "30" }}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Number */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <span className={`text-1xl font-bold ${index < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      #{index + 1}
                    </span>
                  </div>

                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
  <div
    className="w-10 h-10 rounded-lg border-2 flex items-center justify-center overflow-hidden"
    style={{ borderColor: rank.color }}
  >
    {/* Хэрвээ profilePictureURL байгаа бол харуулна */}
    {entry.profilePictureURL ? (
      <img
        src={entry.profilePictureURL}
        alt={entry.userName}
        className="w-full h-full object-cover"
      />
    ) : (
      // Зураг байхгүй бол initials харуулна
      <span className="text-lg font-bold text-primary">
        {entry.userName[0].toUpperCase()}
      </span>
    )}
  </div>
</div>
                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg truncate">{entry.userName}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: rank.color }}>
                        {rank.icon} {rank.name}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
<div className="flex flex-col sm:flex-row gap-1 sm:gap-6 text-[8px] sm:text-sm">
  <div className="text-center">
    <div className="text-muted-foreground text-[8px] sm:text-xs">Best Score</div>
    <div className="font-mono font-semibold text-primary text-[10px] sm:text-base">{entry.bestScore.toLocaleString()}</div>
  </div>
  <div className="text-center">
    <div className="text-muted-foreground text-[8px] sm:text-xs">Games</div>
    <div className="font-mono font-semibold text-[10px] sm:text-base">{entry.totalGames}</div>
  </div>
  <div className="text-center">
    <div className="text-muted-foreground text-[8px] sm:text-xs">Lines</div>
    <div className="font-mono font-semibold text-[10px] sm:text-base">{entry.lines.toLocaleString()}</div>
  </div>
</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
