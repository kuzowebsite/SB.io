"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore"

const BLOCK_SIZE = 20
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L"

interface Position {
  x: number
  y: number
}

interface Tetromino {
  shape: number[][]
  color: string
  type: TetrominoType
}

interface GameState {
  board: number[][]
  score: number
  lines: number
  level: number
  gameOver: boolean
}

interface Player {
  id: string
  name: string
  state: GameState
}

const TETROMINOS: Record<TetrominoType, Omit<Tetromino, "type">> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "#00f0f0",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#f0f000",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#a000f0",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "#00f000",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "#f00000",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#0000f0",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#f0a000",
  },
}

function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))
}

function getRandomTetromino(): Tetromino {
  const types: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"]
  const type = types[Math.floor(Math.random() * types.length)]
  return { ...TETROMINOS[type], type }
}

export default function OnlineBattlePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [matchmaking, setMatchmaking] = useState(true)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [opponent, setOpponent] = useState<Player | null>(null)
  const [myGameState, setMyGameState] = useState<GameState>({
    board: createEmptyBoard(),
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
  })

  // Matchmaking logic
  useEffect(() => {
    if (!user || !matchmaking) return

    let matchmakingDoc: string | null = null
    let unsubscribe: (() => void) | null = null

    const findMatch = async () => {
      // Look for waiting players - filter by status only, then check playerId on client
      const q = query(collection(db, "matchmaking"), where("status", "==", "waiting"))

      const snapshot = await getDocs(q)

      // Filter out own matches on the client side
      const availableMatches = snapshot.docs.filter((doc) => doc.data().playerId !== user.uid)

      if (availableMatches.length > 0) {
        // Join existing match
        const waitingMatch = availableMatches[0]
        const matchData = waitingMatch.data()

        await updateDoc(doc(db, "matchmaking", waitingMatch.id), {
          player2Id: user.uid,
          player2Name: user.displayName || user.email || "Player 2",
          status: "matched",
        })

        setMatchId(waitingMatch.id)
        setOpponent({
          id: matchData.playerId,
          name: matchData.playerName,
          state: {
            board: createEmptyBoard(),
            score: 0,
            lines: 0,
            level: 1,
            gameOver: false,
          },
        })
        setMatchmaking(false)
      } else {
        // Create new match
        const docRef = await addDoc(collection(db, "matchmaking"), {
          playerId: user.uid,
          playerName: user.displayName || user.email || "Player 1",
          player2Id: null,
          player2Name: null,
          status: "waiting",
          createdAt: serverTimestamp(),
        })

        matchmakingDoc = docRef.id

        // Listen for opponent
        unsubscribe = onSnapshot(doc(db, "matchmaking", docRef.id), (doc) => {
          const data = doc.data()
          if (data && data.status === "matched" && data.player2Id) {
            setMatchId(docRef.id)
            setOpponent({
              id: data.player2Id,
              name: data.player2Name,
              state: {
                board: createEmptyBoard(),
                score: 0,
                lines: 0,
                level: 1,
                gameOver: false,
              },
            })
            setMatchmaking(false)
          }
        })
      }
    }

    findMatch()

    return () => {
      if (unsubscribe) unsubscribe()
      if (matchmakingDoc) {
        deleteDoc(doc(db, "matchmaking", matchmakingDoc)).catch(console.error)
      }
    }
  }, [user, matchmaking])

  // Listen to opponent's game state
  useEffect(() => {
    if (!matchId || !opponent) return

    const unsubscribe = onSnapshot(doc(db, "matches", matchId), (doc) => {
      const data = doc.data()
      if (data) {
        const opponentState = data[opponent.id]
        if (opponentState) {
          setOpponent((prev) => (prev ? { ...prev, state: opponentState } : null))
        }
      }
    })

    return () => unsubscribe()
  }, [matchId, opponent])

  if (matchmaking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-700 p-12 text-center">
          <div className="text-6xl mb-6 animate-bounce">⚔️</div>
          <h2 className="text-3xl font-bold mb-4">Өрсөлдөгч хайж байна...</h2>
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-red-800 rounded-full animate-pulse delay-200" />
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse delay-200" />
          </div>
          <Button onClick={() => router.push("/play")} variant="outline" className="text-muted-foreground border-zinc-700">
            Цуцлах
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-7xl w-full">
        {/* Score Header */}
        <div className="text-center mb-8">
          <div className="bg-zinc-900 border-2 border-red-600 rounded-lg p-4 inline-block">
            <div className="flex items-center gap-8">
              <div className="text-2xl font-bold">{user?.displayName || "You"}</div>
              <div className="text-4xl font-bold">
                <span className="text-blue-400">{myGameState.score}</span>
                <span className="mx-4">-</span>
                <span className="text-red-400">{opponent?.state.score || 0}</span>
              </div>
              <div className="text-2xl font-bold">{opponent?.name || "Opponent"}</div>
            </div>
            <div className="text-sm text-zinc-400 mt-2">VERSUS FT1v2</div>
          </div>
        </div>

        {/* Game Boards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* My Board */}
          <Card className="bg-zinc-900 border-zinc-700 p-6">
            <h3 className="text-xl font-bold mb-4 text-center">{user?.displayName || "You"}</h3>
            <div
              className="bg-black border-2 border-zinc-800 rounded"
              style={{ width: BOARD_WIDTH * BLOCK_SIZE, height: BOARD_HEIGHT * BLOCK_SIZE, margin: "0 auto" }}
            >
              {/* Game board rendering would go here */}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-zinc-400">SCORE</div>
                <div className="text-2xl font-bold">{myGameState.score}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">LINES</div>
                <div className="text-2xl font-bold">{myGameState.lines}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">LEVEL</div>
                <div className="text-2xl font-bold">{myGameState.level}</div>
              </div>
            </div>
          </Card>

          {/* Opponent Board */}
          <Card className="bg-zinc-900 border-zinc-700 p-6">
            <h3 className="text-xl font-bold mb-4 text-center">{opponent?.name || "Opponent"}</h3>
            <div
              className="bg-black border-2 border-zinc-800 rounded"
              style={{ width: BOARD_WIDTH * BLOCK_SIZE, height: BOARD_HEIGHT * BLOCK_SIZE, margin: "0 auto" }}
            >
              {/* Opponent board rendering would go here */}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-zinc-400">SCORE</div>
                <div className="text-2xl font-bold">{opponent?.state.score || 0}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">LINES</div>
                <div className="text-2xl font-bold">{opponent?.state.lines || 0}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">LEVEL</div>
                <div className="text-2xl font-bold">{opponent?.state.level || 1}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button onClick={() => router.push("/play")} variant="outline" className="text-white border-zinc-700">
            ← Буцах
          </Button>
        </div>
      </div>
    </div>
  )
}
