import TetrisGame from "@/components/tetris-game"
import { ProtectedRoute } from "@/components/protected-route"

export default function PlayPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <TetrisGame />
      </main>
    </ProtectedRoute>
  )
}
