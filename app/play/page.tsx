"use client"

import Link from "next/link"
import { ProtectedRoute } from "@/components/protected-route"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function PlayPage() {
  const [lightningPositions, setLightningPositions] = useState<{ x: number; y: number; delay: number }[]>([])

  useEffect(() => {
    const positions = Array.from({ length: 8 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }))
    setLightningPositions(positions)
  }, [])

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {lightningPositions.map((pos, i) => (
            <div
              key={i}
              className="absolute w-px bg-gradient-to-b from-transparent via-cyan-500 to-transparent opacity-0 animate-lightning"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                height: "200px",
                animationDelay: `${pos.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none" />

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl w-full">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <div className="text-center mt-8 sm:mt-12 lg:-translate-x-150 lg:-translate-y-14 sm:-translate-x-80 -translate-x-30 -translate-y-8 sm:-translate-y-50">
              <Link href="/">
                <Button
                  variant="outline"
                  className="text-white border-zinc-800 hover:bg-text-800 hover:border-zinc-700 bg-transparent px-6 sm:px-8 py-2 sm:py-2.5 bg-black"
                >
                  ← Буцах
                </Button>
              </Link>
            </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-mono mb-3 sm:mb-4 text-white tracking-tight">
                ТОГЛОХ ГОРИМ СОНГОХ
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-zinc-400">Та ямар горимоор тоглохоо сонгоно уу</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Solo Mode */}
              <Link href="/play/solo" className="group">
                <Card className="relative bg-zinc-950 border-zinc-800 hover:border-cyan-500/50 border-2 p-6 sm:p-8 transition-all duration-300 cursor-pointer h-full overflow-hidden group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                  <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                    </svg>
                  </div>

                  <div className="relative space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                        <span className="text-3xl sm:text-4xl">🎮</span>
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">Solo Mode</h2>
                        <div className="h-0.5 w-0 group-hover:w-full bg-cyan-500 transition-all duration-300" />
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                      Ганцаараа тоглож, өөрийн рекордоо эвд
                    </p>

                    <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 sm:py-3 text-base sm:text-lg border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all">
                      ЭХЛЭХ
                    </Button>
                  </div>
                </Card>
              </Link>

              {/* Online Battle */}
              <Link href="/play/online-battle" className="group">
                <Card className="relative bg-zinc-950 border-zinc-800 hover:border-red-500/50 border-2 p-6 sm:p-8 transition-all duration-300 cursor-pointer h-full overflow-hidden group-hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                  <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg className="w-16 h-16 sm:w-20 sm:h-20 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                    </svg>
                  </div>

                  <div className="relative space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                        <span className="text-3xl sm:text-4xl">⚔️</span>
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">Online Battle</h2>
                        <div className="h-0.5 w-0 group-hover:w-full bg-red-500 transition-all duration-300" />
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                      Санамсаргүй тоглогчтой 1v1 өрсөлдөөн
                    </p>

                    <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 sm:py-3 text-base sm:text-lg border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all">
                      ТУЛАЛДАХ
                    </Button>
                  </div>
                </Card>
              </Link>

              {/* Custom */}
              <Link href="/play/custom" className="group md:col-span-2 lg:col-span-1">
                <Card className="relative bg-zinc-950 border-zinc-800 hover:border-purple-500/50 border-2 p-6 sm:p-8 transition-all duration-300 cursor-pointer h-full overflow-hidden group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg className="w-16 h-16 sm:w-20 sm:h-20 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                    </svg>
                  </div>

                  <div className="relative space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                        <span className="text-3xl sm:text-4xl">👥</span>
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">Custom</h2>
                        <div className="h-0.5 w-0 group-hover:w-full bg-purple-500 transition-all duration-300" />
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">Найзуудтайгаа хамт тоглох</p>

                    <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 sm:py-3 text-base sm:text-lg border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all">
                      ХОЛБОГДОХ
                    </Button>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
