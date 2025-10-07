"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import {
  getTopScores,
  getBattleRankLeaderboard,
  getTotalPlayers,
  getTotalGames,
  subscribeToOnlinePlayers,
  type LeaderboardEntry,
} from "@/lib/game-service"
import { getRankByScore, RANKS, BATTLE_RANKS, getLevelFromXP, type Rank, type BattleRank } from "@/lib/rank-system"
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
  const [rankSystemType, setRankSystemType] = useState<"solo" | "battle">("solo")
  const [selectedRank, setSelectedRank] = useState<Rank | BattleRank | null>(null)

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

    return () => unsubscribe()
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
        <p className="text-muted-foreground text-lg">Цолны дараалал, leaderboard болон бусад мэдээллийг харна уу</p>
      </div>

      {/* Rank System Info */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">Цолууд</h3>
          <div className="flex gap-2">
            <Button
              variant={rankSystemType === "solo" ? "default" : "ghost"}
              onClick={() => setRankSystemType("solo")}
              size="sm"
              className="font-semibold"
            >
              Solo Rank
            </Button>
            <Button
              variant={rankSystemType === "battle" ? "default" : "ghost"}
              onClick={() => setRankSystemType("battle")}
              size="sm"
              className="font-semibold"
            >
              Battle Rank
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {rankSystemType === "solo"
            ? "Цол нь таны хамгийн өндөр рекорд оноогоор тодорхойлогдоно. Дарж дэлгэрэнгүй мэдээлэл үзнэ үү."
            : "Battle Rank нь таны өрсөлдөөний оноогоор (ELO систем) тодорхойлогдоно. Дарж дэлгэрэнгүй мэдээлэл үзнэ үү."}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {(rankSystemType === "solo" ? RANKS : BATTLE_RANKS).map((rank) => (
            <button
              key={rank.id}
              onClick={() => setSelectedRank(rank)}
              className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-all hover:scale-105 text-left"
              style={{ borderColor: rank.color + "40" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={rank.icon || "/placeholder.svg"}
                  alt={rank.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="font-bold text-xs" style={{ color: rank.color }}>
                  {rank.name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {"minScore" in rank
                  ? `${rank.minScore.toLocaleString()} оноо`
                  : `${rank.minPoints.toLocaleString()} points`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
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
              <img
                src={selectedRank.icon || "/placeholder.svg"}
                alt={selectedRank.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="text-xl font-bold" style={{ color: selectedRank.color }}>
                  {selectedRank.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {"minScore" in selectedRank
                    ? `${selectedRank.minScore.toLocaleString()} оноо шаардлагатай`
                    : `${selectedRank.minPoints.toLocaleString()} battle points шаардлагатай`}
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
  const [leaderboardType, setLeaderboardType] = useState<"solo" | "battle">("solo")
  const [scores, setScores] = useState<LeaderboardEntry[]>([])
  const [filteredScores, setFilteredScores] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setLoading(true)
    const fetchFunction = leaderboardType === "solo" ? getTopScores : getBattleRankLeaderboard

    fetchFunction(20)
      .then((data) => {
        setScores(data)
        setFilteredScores(data)
        setError(null)
      })
      .catch((err) => {
        console.error("Error loading scores:", err)
        setError("Leaderboard өгөгдөл татахад алдаа гарлаа. Интернэт холболтоо шалгана уу.")
      })
      .finally(() => setLoading(false))
  }, [leaderboardType])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredScores(scores)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = scores.filter((entry) => entry.userName.toLowerCase().includes(term))
      setFilteredScores(filtered)
    }
  }, [searchTerm, scores])

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
      {/* Leaderboard Type Selector */}
      <div className="flex gap-2 border-b border-border/50 pb-2">
        <Button
          variant={leaderboardType === "solo" ? "default" : "ghost"}
          onClick={() => setLeaderboardType("solo")}
          className="font-semibold"
        >
          Solo Rank
        </Button>
        <Button
          variant={leaderboardType === "battle" ? "default" : "ghost"}
          onClick={() => setLeaderboardType("battle")}
          className="font-semibold"
        >
          Battle Rank
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold">{leaderboardType === "solo" ? "SOLO RANK" : "BATTLE RANK"}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {leaderboardType === "solo"
            ? "Нэг тоглолтын хамгийн өндөр оноогоор эрэмблэгдсэн"
            : "Өрсөлдөөний оноогоор эрэмблэгдсэн (ELO систем)"}
        </p>

        {/* Search Box */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Тоглогчийн нэрээр хайх..."
            className="w-full p-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredScores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Одоогоор хайлтанд тохирох тоглогч байхгүй байна.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScores.map((entry, index) => {
            const rank = getRankByScore(entry.bestScore)
            const level = getLevelFromXP(entry.totalXP || 0)
            const originalIndex = scores.findIndex((s) => s.id === entry.id)
            const position = originalIndex !== -1 ? originalIndex + 1 : index + 1

            const getElectricIntensity = (pos: number) => {
              if (pos <= 3) return 1.0
              if (pos <= 10) return 0.7
              if (pos <= 20) return 0.4
              return 0.2
            }

            const intensity = getElectricIntensity(position)

            return (
              <div
                key={entry.id}
                className="relative p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors overflow-hidden"
                style={{ borderColor: rank.color + "30" }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ opacity: intensity }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-electric-spark-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-electric-spark-2" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-electric-spark-3" />
                  <div className="absolute inset-0 bg-cyan-500/10 animate-electric-pulse" />
                </div>

                <div className="relative flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 text-center">
                    <span
                      className={`text-xl font-bold ${position <= 3 ? "text-primary animate-electric-shimmer" : "text-muted-foreground"}`}
                      style={
                        position <= 3
                          ? {
                              textShadow: `0 0 10px ${rank.color}, 0 0 20px ${rank.color}`,
                            }
                          : {}
                      }
                    >
                      №{position}
                    </span>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-lg border-2 flex items-center justify-center overflow-hidden"
                      style={{
                        borderColor: rank.color,
                        boxShadow: position <= 3 ? `0 0 15px ${rank.color}` : "none",
                      }}
                    >
                      {entry.profilePictureURL ? (
                        <img
                          src={entry.profilePictureURL || "/placeholder.svg"}
                          alt={entry.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={rank.icon || "/placeholder.svg"}
                          alt={rank.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        LV {level}
                      </span>
                      <div className="font-bold text-lg truncate">{entry.userName}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-sm font-semibold flex items-center gap-1" style={{ color: rank.color }}>
                        <img
                          src={rank.icon || "/placeholder.svg"}
                          alt={rank.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        {rank.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-6 text-[8px] sm:text-sm">
                    {leaderboardType === "solo" ? (
                      <>
                        <div className="text-center">
                          <div className="text-muted-foreground text-[8px] sm:text-xs">Best Score</div>
                          <div className="font-mono font-semibold text-primary text-[10px] sm:text-base">
                            {entry.bestScore.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-[8px] sm:text-xs">Games</div>
                          <div className="font-mono font-semibold text-[10px] sm:text-base">{entry.totalGames}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-[8px] sm:text-xs">Lines</div>
                          <div className="font-mono font-semibold text-[10px] sm:text-base">
                            {entry.lines.toLocaleString()}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-muted-foreground text-[8px] sm:text-xs">Battle Points</div>
                          <div className="font-mono font-semibold text-primary text-[10px] sm:text-base">
                            {(entry.battlePoints || 1000).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-[8px] sm:text-xs">Wins</div>
                          <div className="font-mono font-semibold text-green-500 text-[10px] sm:text-base">
                            {entry.battleWins || 0}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-[8px] sm:text-xs">Losses</div>
                          <div className="font-mono font-semibold text-red-500 text-[10px] sm:text-base">
                            {entry.battleLosses || 0}
                          </div>
                        </div>
                      </>
                    )}
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
