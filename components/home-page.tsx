"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { trackUserPresence } from "@/lib/game-service"

export default function HomePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      const cleanup = trackUserPresence(user.uid, user.displayName || user.email || "Anonymous")
      return cleanup
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tighter">
                <span className="text-primary">SB</span>
                <span className="animate-pulse text-primary">.iO</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link href="/play">
                <Button
                  variant="ghost"
                  className="text-base lg:text-lg font-semibold hover:text-primary transition-colors"
                >
                  PLAY
                </Button>
              </Link>
              <Link href="/channel">
                <Button
                  variant="ghost"
                  className="text-base lg:text-lg font-semibold hover:text-secondary transition-colors"
                >
                  SB CHANNEL
                </Button>
              </Link>
              <Link href="/merch">
                <Button
                  variant="ghost"
                  className="text-base lg:text-lg font-semibold hover:text-accent transition-colors"
                >
                  MERCH
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="ghost"
                  className="text-base lg:text-lg font-semibold hover:text-chart-4 transition-colors"
                >
                  ABOUT
                </Button>
              </Link>

              {user ? (
                <div className="ml-4">
                  <ProfileDropdown />
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-4">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-sm">
                      LOGIN
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="default" size="sm" className="text-sm">
                      SIGN UP
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-16 sm:pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center py-12 sm:py-20">
            {/* Animated Background Grid */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center space-y-6 sm:space-y-8 max-w-5xl">
              {/* Main Title */}
              <div className="space-y-2 sm:space-y-4">
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold font-mono tracking-tighter">
                  <span className="inline-block animate-pulse text-primary">SB</span>
                  <span className="inline-block animate-pulse animate-pulse text-primary">.iO</span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium">
                  SB.iO тоглоом
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto py-6 sm:py-8">
                <div className="p-3 sm:p-4 rounded-lg bg-card border border-primary/20">
                  <div className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">⚡</div>
                  <div className="text-xs sm:text-sm font-semibold">Хурдан</div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-card border border-secondary/20">
                  <div className="text-2xl sm:text-3xl font-bold text-secondary mb-1 sm:mb-2">🎮</div>
                  <div className="text-xs sm:text-sm font-semibold">Сонирхолтой</div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-card border border-accent/20">
                  <div className="text-2xl sm:text-3xl font-bold text-accent mb-1 sm:mb-2">🏆</div>
                  <div className="text-xs sm:text-sm font-semibold">Өрсөлдөөнтэй</div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-card border border-chart-4/20">
                  <div className="text-2xl sm:text-3xl font-bold text-chart-4 mb-1 sm:mb-2">✨</div>
                  <div className="text-xs sm:text-sm font-semibold">Орчин үеийн</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 sm:pt-6">
                <Link href="/play" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-5 sm:py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/50 hover:shadow-primary/70 transition-all hover:scale-105"
                  >
                    ТОГЛОХ
                  </Button>
                </Link>
                <Link href="/about" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-5 sm:py-6 border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground font-bold rounded-lg transition-all hover:scale-105 bg-primary"
                  >
                    ДЭЛГЭРЭНГҮЙ
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="pt-8 sm:pt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-bold text-primary font-mono">1M+</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">Тоглогчид</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-bold text-secondary font-mono">10M+</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">Тоглолтууд</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-bold text-accent font-mono">24/7</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">Онлайн</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              © 2025 SB.io. Бүх эрх хуулиар хамгаалагдсан.
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                Нууцлал
              </Link>
              <Link
                href="#"
                className="text-xs sm:text-sm text-muted-foreground hover:text-secondary transition-colors"
              >
                Үйлчилгээний нөхцөл
              </Link>
              <Link href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-accent transition-colors">
                Холбоо барих
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
