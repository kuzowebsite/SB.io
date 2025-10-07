"use client"

import { useEffect, useRef, useState, useCallback } from "react"
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
  setDoc,
} from "firebase/firestore"
import { getRankByBattlePoints, type BattleRank } from "@/lib/rank-system"
import { updateBattleResult, getUserProfile, type UserProfile } from "@/lib/game-service"

const BLOCK_SIZE = 30
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const OPPONENT_BLOCK_SIZE = 10

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
  boardColors: string[][]
  currentPiece: Tetromino | null
  position: Position
  score: number
  lines: number
  level: number
  gameOver: boolean
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

function createEmptyColorBoard(): string[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(""))
}

function getRandomTetromino(): Tetromino {
  const types: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"]
  const type = types[Math.floor(Math.random() * types.length)]
  return { ...TETROMINOS[type], type }
}

function generateQueue(count: number): Tetromino[] {
  return Array.from({ length: count }, () => getRandomTetromino())
}

export default function OnlineBattlePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const opponentCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Matchmaking state
  const [matchmaking, setMatchmaking] = useState(true)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [opponentId, setOpponentId] = useState<string | null>(null)
  const [opponentName, setOpponentName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const [myProfile, setMyProfile] = useState<UserProfile | null>(null)
  const [opponentProfile, setOpponentProfile] = useState<UserProfile | null>(null)
  const [myRank, setMyRank] = useState<BattleRank | null>(null)
  const [opponentRank, setOpponentRank] = useState<BattleRank | null>(null)
  const [battlePointsChange, setBattlePointsChange] = useState<number | null>(null)
  const [battleResult, setBattleResult] = useState<"win" | "loss" | null>(null)

  const [board, setBoard] = useState<number[][]>(createEmptyBoard())
  const boardColors = useRef<string[][]>(createEmptyColorBoard())
  const [currentPiece, setCurrentPiece] = useState<Tetromino>(getRandomTetromino())
  const [nextQueue, setNextQueue] = useState<Tetromino[]>(generateQueue(5))
  const [holdPiece, setHoldPiece] = useState<Tetromino | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [position, setPosition] = useState<Position>({ x: 3, y: 0 })
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [pieces, setPieces] = useState(0)
  const [inputs, setInputs] = useState(0)
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [clearingLines, setClearingLines] = useState<number[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const [opponentState, setOpponentState] = useState<GameState>({
    board: createEmptyBoard(),
    boardColors: createEmptyColorBoard(),
    currentPiece: null,
    position: { x: 0, y: 0 },
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
  })

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const [opponentFinishedFirst, setOpponentFinishedFirst] = useState(false)
  const [opponentFinalScore, setOpponentFinalScore] = useState<number | null>(null)

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  const playLineClearSound = useCallback(() => {
    if (!audioContextRef.current) return
    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = "square"
    oscillator.frequency.setValueAtTime(800, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)
  }, [])

  const playGameOverSound = useCallback(() => {
    if (!audioContextRef.current) return
    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = "sawtooth"
    oscillator.frequency.setValueAtTime(440, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 1)
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 1)
  }, [])

  useEffect(() => {
    console.log("[v0] Component mounted", { user: !!user, loading, db: !!db })

    if (!user) {
      console.log("[v0] No user found")
      return
    }

    if (!db) {
      console.log("[v0] Firebase not configured")
      setError("Firebase тохиргоо хийгдээгүй байна")
      return
    }

    const loadUserProfile = async () => {
      try {
        console.log("[v0] Loading user profile for:", user.uid)
        const profile = await getUserProfile(user.uid)
        if (profile) {
          setMyProfile(profile)
          const rank = getRankByBattlePoints(profile.battlePoints || 1000)
          setMyRank(rank)
          console.log("[v0] User profile loaded successfully:", {
            battlePoints: profile.battlePoints,
            rank: rank.name,
          })
        } else {
          console.log("[v0] No profile found, will be created on first game")
        }
      } catch (err) {
        console.error("[v0] Error loading user profile:", err)
        setError("Хэрэглэгчийн мэдээлэл ачаалахад алдаа гарлаа")
      }
    }

    loadUserProfile()
  }, [user, loading])

  useEffect(() => {
    if (!opponentId || !db) return

    const loadOpponentProfile = async () => {
      try {
        const profile = await getUserProfile(opponentId)
        if (profile) {
          setOpponentProfile(profile)
          const rank = getRankByBattlePoints(profile.battlePoints || 1000)
          setOpponentRank(rank)
          console.log("[v0] Loaded opponent profile:", profile)
        }
      } catch (err) {
        console.error("[v0] Error loading opponent profile:", err)
      }
    }

    loadOpponentProfile()
  }, [opponentId])

  useEffect(() => {
    if (!gameOver || !user || !opponentId || !db || battlePointsChange !== null) return
    if (!myProfile || !opponentProfile) {
      console.log("[v0] Waiting for profiles to load before updating battle result")
      return
    }

    const updateBattle = async () => {
      try {
        const iWon = score > opponentState.score
        setBattleResult(iWon ? "win" : "loss")

        console.log("[v0] Battle ended - both players finished:", {
          iWon,
          myScore: score,
          opponentScore: opponentState.score,
        })

        if (iWon) {
          console.log("[v0] Updating battle result - I won")
          await updateBattleResult(user.uid, opponentId, {
            winnerScore: score,
            winnerLines: lines,
            winnerTime: elapsedTime,
            loserScore: opponentState.score,
            loserLines: opponentState.lines,
            loserTime: elapsedTime,
          })
        } else {
          console.log("[v0] Updating battle result - I lost")
          await updateBattleResult(opponentId, user.uid, {
            winnerScore: opponentState.score,
            winnerLines: opponentState.lines,
            winnerTime: elapsedTime,
            loserScore: score,
            loserLines: lines,
            loserTime: elapsedTime,
          })
        }

        const updatedProfile = await getUserProfile(user.uid)
        if (updatedProfile) {
          const pointsChange = updatedProfile.battlePoints - myProfile.battlePoints
          setBattlePointsChange(pointsChange)
          setMyProfile(updatedProfile)
          const newRank = getRankByBattlePoints(updatedProfile.battlePoints)
          setMyRank(newRank)
          console.log("[v0] Battle result updated successfully:", {
            pointsChange,
            newPoints: updatedProfile.battlePoints,
            newRank: newRank.name,
          })
        }
      } catch (err) {
        console.error("[v0] Error updating battle result:", err)
        setError("Тоглоомын үр дүн хадгалахад алдаа гарлаа")
      }
    }

    updateBattle()
  }, [
    gameOver,
    opponentState.gameOver,
    user,
    opponentId,
    myProfile,
    opponentProfile,
    score,
    opponentState.score,
    opponentState.lines,
    lines,
    elapsedTime,
    battlePointsChange,
  ])

  useEffect(() => {
    if (!user || !matchmaking || loading || !db) {
      console.log("[v0] Skipping matchmaking:", { user: !!user, matchmaking, loading, db: !!db })
      return
    }

    let matchmakingDoc: string | null = null
    let unsubscribe: (() => void) | null = null

    const findMatch = async () => {
      try {
        console.log("[v0] Starting matchmaking for user:", user.uid)
        const q = query(collection(db, "matchmaking"), where("status", "==", "waiting"))
        const snapshot = await getDocs(q)
        const availableMatches = snapshot.docs.filter((doc) => doc.data().playerId !== user.uid)

        if (availableMatches.length > 0) {
          console.log("[v0] Found", availableMatches.length, "available matches")
          const waitingMatch = availableMatches[0]
          const matchData = waitingMatch.data()

          await updateDoc(doc(db, "matchmaking", waitingMatch.id), {
            player2Id: user.uid,
            player2Name: user.displayName || user.email || "Player 2",
            status: "matched",
          })

          setMatchId(waitingMatch.id)
          setOpponentId(matchData.playerId)
          setOpponentName(matchData.playerName)
          setMatchmaking(false)
          console.log("[v0] Matched successfully with:", matchData.playerName)
        } else {
          console.log("[v0] No matches found, creating new match")
          const docRef = await addDoc(collection(db, "matchmaking"), {
            playerId: user.uid,
            playerName: user.displayName || user.email || "Player 1",
            player2Id: null,
            player2Name: null,
            status: "waiting",
            createdAt: serverTimestamp(),
          })

          matchmakingDoc = docRef.id
          console.log("[v0] Created match:", docRef.id, "- waiting for opponent...")

          unsubscribe = onSnapshot(doc(db, "matchmaking", docRef.id), (doc) => {
            const data = doc.data()
            console.log("[v0] Match status update:", data?.status)
            if (data && data.status === "matched" && data.player2Id) {
              console.log("[v0] Opponent found:", data.player2Name)
              setMatchId(docRef.id)
              setOpponentId(data.player2Id)
              setOpponentName(data.player2Name)
              setMatchmaking(false)
            }
          })
        }
      } catch (err) {
        console.error("[v0] Matchmaking error:", err)
        setError("Өрсөлдөгч хайхад алдаа гарлаа. Дахин оролдоно уу.")
      }
    }

    findMatch()

    return () => {
      console.log("[v0] Cleaning up matchmaking")
      if (unsubscribe) unsubscribe()
      if (matchmakingDoc) {
        deleteDoc(doc(db, "matchmaking", matchmakingDoc)).catch((err) => {
          console.error("[v0] Error deleting matchmaking doc:", err)
        })
      }
    }
  }, [user, matchmaking, loading])

  useEffect(() => {
    if (!matchId || !user || gameOver || !db) {
      return
    }

    const gameStateData = {
      board: JSON.stringify(board),
      boardColors: JSON.stringify(boardColors.current),
      currentPiece: currentPiece
        ? {
            shape: JSON.stringify(currentPiece.shape),
            color: currentPiece.color,
            type: currentPiece.type,
          }
        : null,
      position,
      score,
      lines,
      level,
      gameOver,
      updatedAt: Date.now(),
    }

    console.log("[v0] Syncing game state:", { matchId, score, lines, level })

    setDoc(doc(db, "battleGames", `${matchId}_${user.uid}`), gameStateData, { merge: true }).catch((err) => {
      console.error("[v0] Error syncing game state:", err)
    })
  }, [matchId, user, board, currentPiece, position, score, lines, level, gameOver])

  useEffect(() => {
    if (!matchId || !opponentId || !db) {
      return
    }

    console.log("[v0] Setting up opponent state listener:", { matchId, opponentId })

    const unsubscribe = onSnapshot(
      doc(db, "battleGames", `${matchId}_${opponentId}`),
      (doc) => {
        const data = doc.data()
        if (data) {
          console.log("[v0] Opponent state updated:", {
            score: data.score,
            lines: data.lines,
            gameOver: data.gameOver,
          })
          setOpponentState({
            board: data.board ? JSON.parse(data.board) : createEmptyBoard(),
            boardColors: data.boardColors ? JSON.parse(data.boardColors) : createEmptyColorBoard(),
            currentPiece: data.currentPiece
              ? {
                  shape: JSON.parse(data.currentPiece.shape),
                  color: data.currentPiece.color,
                  type: data.currentPiece.type,
                }
              : null,
            position: data.position || { x: 0, y: 0 },
            score: data.score || 0,
            lines: data.lines || 0,
            level: data.level || 1,
            gameOver: data.gameOver || false,
          })
        }
      },
      (err) => {
        console.error("[v0] Error listening to opponent state:", err)
      },
    )

    return () => {
      console.log("[v0] Cleaning up opponent state listener")
      unsubscribe()
    }
  }, [matchId, opponentId])

  useEffect(() => {
    if (opponentState.gameOver && !gameOver && opponentFinalScore === null) {
      setOpponentFinishedFirst(true)
      setOpponentFinalScore(opponentState.score)
      console.log("[v0] Opponent finished first with score:", opponentState.score)
    }
  }, [opponentState.gameOver, opponentState.score, gameOver, opponentFinalScore])

  const checkCollision = useCallback(
    (piece: Tetromino, pos: Position): boolean => {
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const newX = pos.x + x
            const newY = pos.y + y
            if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT || (newY >= 0 && board[newY][newX])) {
              return true
            }
          }
        }
      }
      return false
    },
    [board],
  )

  const mergePiece = useCallback(
    (pos?: Position) => {
      const actualPos = pos || position
      const newBoard = board.map((row) => [...row])
      const newColors = boardColors.current.map((row) => [...row])

      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = actualPos.y + y
            const boardX = actualPos.x + x
            if (boardY >= 0) {
              newBoard[boardY][boardX] = 1
              newColors[boardY][boardX] = currentPiece.color
            }
          }
        }
      }

      boardColors.current = newColors
      setBoard(newBoard)
    },
    [board, currentPiece, position],
  )

  const clearLines = useCallback(() => {
    const linesToClear: number[] = []
    board.forEach((row, index) => {
      if (row.every((cell) => cell === 1)) {
        linesToClear.push(index)
      }
    })

    if (linesToClear.length > 0) {
      setIsClearing(true)
      setClearingLines(linesToClear)
      playLineClearSound()

      setTimeout(() => {
        const newBoard = board.filter((_, index) => !linesToClear.includes(index))
        const newColors = boardColors.current.filter((_, index) => !linesToClear.includes(index))

        while (newBoard.length < BOARD_HEIGHT) {
          newBoard.unshift(Array(BOARD_WIDTH).fill(0))
          newColors.unshift(Array(BOARD_WIDTH).fill(""))
        }

        boardColors.current = newColors
        setBoard(newBoard)
        setLines((prev) => prev + linesToClear.length)
        setScore((prev) => prev + linesToClear.length * 100 * level)
        setLevel(Math.floor((lines + linesToClear.length) / 10) + 1)
        setClearingLines([])
        setIsClearing(false)
      }, 300)
    }
  }, [board, level, lines, playLineClearSound])

  const holdCurrentPiece = useCallback(() => {
    if (gameOver || !canHold || isClearing) return
    setInputs((prev) => prev + 1)

    if (holdPiece === null) {
      setHoldPiece(currentPiece)
      const newPiece = nextQueue[0]
      setNextQueue((prev) => [...prev.slice(1), getRandomTetromino()])
      setCurrentPiece(newPiece)
      setPosition({ x: 3, y: 0 })
      setPieces((prev) => prev + 1)
    } else {
      const temp = currentPiece
      setCurrentPiece(holdPiece)
      setHoldPiece(temp)
      setPosition({ x: 3, y: 0 })
    }
    setCanHold(false)
  }, [currentPiece, holdPiece, nextQueue, canHold, gameOver, isClearing])

  const rotatePiece = useCallback(() => {
    if (gameOver || isClearing) return
    setInputs((prev) => prev + 1)
    const rotated = currentPiece.shape[0].map((_, i) => currentPiece.shape.map((row) => row[i]).reverse())
    const rotatedPiece = { ...currentPiece, shape: rotated }
    if (!checkCollision(rotatedPiece, position)) {
      setCurrentPiece(rotatedPiece)
    }
  }, [currentPiece, position, checkCollision, gameOver, isClearing])

  const moveDown = useCallback(() => {
    if (gameOver || isClearing) return
    const newPos = { x: position.x, y: position.y + 1 }

    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos)
    } else {
      mergePiece()
      clearLines()

      const newPiece = nextQueue[0]
      setNextQueue((prev) => [...prev.slice(1), getRandomTetromino()])
      const startPos = { x: 3, y: 0 }

      if (checkCollision(newPiece, startPos)) {
        setGameOver(true)
        playGameOverSound()
      } else {
        setCurrentPiece(newPiece)
        setPosition(startPos)
        setPieces((prev) => prev + 1)
        setCanHold(true)
      }
    }
  }, [
    position,
    currentPiece,
    nextQueue,
    checkCollision,
    mergePiece,
    clearLines,
    gameOver,
    isClearing,
    playGameOverSound,
  ])

  const moveLeft = useCallback(() => {
    if (gameOver || isClearing) return
    setInputs((prev) => prev + 1)
    const newPos = { x: position.x - 1, y: position.y }
    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos)
    }
  }, [position, currentPiece, checkCollision, gameOver, isClearing])

  const moveRight = useCallback(() => {
    if (gameOver || isClearing) return
    setInputs((prev) => prev + 1)
    const newPos = { x: position.x + 1, y: position.y }
    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos)
    }
  }, [position, currentPiece, checkCollision, gameOver, isClearing])

  const hardDrop = useCallback(() => {
    if (gameOver || isClearing) return
    setInputs((prev) => prev + 1)

    let newY = position.y
    while (!checkCollision(currentPiece, { x: position.x, y: newY + 1 })) {
      newY++
    }

    const dropPosition = { x: position.x, y: newY }
    mergePiece(dropPosition)
    clearLines()

    const newPiece = nextQueue[0]
    setNextQueue((prev) => [...prev.slice(1), getRandomTetromino()])
    const startPos = { x: 3, y: 0 }

    if (checkCollision(newPiece, startPos)) {
      setGameOver(true)
      playGameOverSound()
    } else {
      setCurrentPiece(newPiece)
      setPosition(startPos)
      setPieces((prev) => prev + 1)
      setCanHold(true)
    }
  }, [
    position,
    currentPiece,
    nextQueue,
    checkCollision,
    mergePiece,
    clearLines,
    gameOver,
    isClearing,
    playGameOverSound,
  ])

  useEffect(() => {
    if (gameOver) return
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, gameOver])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          moveLeft()
          break
        case "ArrowRight":
          e.preventDefault()
          moveRight()
          break
        case "ArrowDown":
          e.preventDefault()
          moveDown()
          break
        case "ArrowUp":
        case " ":
          e.preventDefault()
          rotatePiece()
          break
        case "c":
        case "C":
        case "Shift":
          e.preventDefault()
          holdCurrentPiece()
          break
        case "Enter":
          e.preventDefault()
          hardDrop()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [moveLeft, moveRight, moveDown, rotatePiece, hardDrop, holdCurrentPiece, gameOver])

  useEffect(() => {
    if (gameOver || isClearing) return
    const speed = Math.max(100, 1000 - (level - 1) * 100)
    const interval = setInterval(moveDown, speed)
    return () => clearInterval(interval)
  }, [moveDown, level, gameOver, isClearing])

  const renderPreview = (piece: Tetromino | null, size = 20) => {
    if (!piece) return null
    return (
      <div className="relative" style={{ width: size * 4, height: size * 4 }}>
        {piece.shape.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <div
                key={`${y}-${x}`}
                className="absolute"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: piece.color,
                  left: `${x * size}px`,
                  top: `${y * size}px`,
                  border: "2px solid rgba(0,0,0,0.3)",
                }}
              />
            ) : null,
          ),
        )}
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    return `${seconds}s`
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const render = () => {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.lineWidth = 1
      for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * BLOCK_SIZE)
        ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE)
        ctx.stroke()
      }
      for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath()
        ctx.moveTo(x * BLOCK_SIZE, 0)
        ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE)
        ctx.stroke()
      }

      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          if (board[y][x]) {
            const color = boardColors.current[y][x] || "#666666"
            ctx.fillStyle = color
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
            ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
            ctx.lineWidth = 2
            ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
          }
        }
      }

      if (!gameOver && !isClearing) {
        let ghostY = position.y
        while (!checkCollision(currentPiece, { x: position.x, y: ghostY + 1 })) {
          ghostY++
        }

        for (let y = 0; y < currentPiece.shape.length; y++) {
          for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
              const boardX = position.x + x
              const boardY = ghostY + y
              if (boardY >= 0) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
                ctx.fillRect(boardX * BLOCK_SIZE, boardY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
              }
            }
          }
        }
      }

      if (!gameOver && !isClearing) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
          for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
              const boardX = position.x + x
              const boardY = position.y + y
              if (boardY >= 0) {
                ctx.fillStyle = currentPiece.color
                ctx.fillRect(boardX * BLOCK_SIZE, boardY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
                ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
                ctx.lineWidth = 2
                ctx.strokeRect(boardX * BLOCK_SIZE, boardY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
              }
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [board, currentPiece, position, gameOver, isClearing, checkCollision])

  useEffect(() => {
    const canvas = opponentCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const render = () => {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          if (opponentState.board[y][x]) {
            const color = opponentState.boardColors[y][x] || "#666666"
            ctx.fillStyle = color
            ctx.fillRect(x * OPPONENT_BLOCK_SIZE, y * OPPONENT_BLOCK_SIZE, OPPONENT_BLOCK_SIZE, OPPONENT_BLOCK_SIZE)
          }
        }
      }

      if (opponentState.currentPiece && !opponentState.gameOver) {
        for (let y = 0; y < opponentState.currentPiece.shape.length; y++) {
          for (let x = 0; x < opponentState.currentPiece.shape[y].length; x++) {
            if (opponentState.currentPiece.shape[y][x]) {
              const boardX = opponentState.position.x + x
              const boardY = opponentState.position.y + y
              if (boardY >= 0) {
                ctx.fillStyle = opponentState.currentPiece.color
                ctx.fillRect(
                  boardX * OPPONENT_BLOCK_SIZE,
                  boardY * OPPONENT_BLOCK_SIZE,
                  OPPONENT_BLOCK_SIZE,
                  OPPONENT_BLOCK_SIZE,
                )
              }
            }
          }
        }
      }

      requestAnimationFrame(render)
    }

    render()
  }, [opponentState])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-700 p-8 sm:p-12 text-center max-w-md">
          <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 animate-pulse">⏳</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">Ачааллаж байна...</h2>
        </Card>
      </div>
    )
  }

  if (!user) {
    console.log("[v0] No user, redirecting to home")
    router.push("/")
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-700 p-6 sm:p-12 text-center max-w-md">
          <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">❌</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-red-500">Алдаа гарлаа</h2>
          <p className="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6">{error}</p>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-full text-muted-foreground border-zinc-700"
          >
            Буцах
          </Button>
        </Card>
      </div>
    )
  }

  if (matchmaking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-700 p-8 sm:p-12 text-center max-w-md">
          <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 animate-bounce">⚔️</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Өрсөлдөгч хайж байна...</h2>
          {myRank && myProfile && (
            <div className="mb-4 p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xl font-bold" style={{ color: myRank.color }}>
                  {myRank.name}
                </span>
              </div>
              <div className="text-sm text-zinc-400">{myProfile.battlePoints} Battle Points</div>
              <div className="text-xs text-zinc-500 mt-1">
                {myProfile.battleWins}W - {myProfile.battleLosses}L
              </div>
            </div>
          )}
          <div className="flex justify-center gap-2 mb-4 sm:mb-6">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-red-800 rounded-full animate-pulse delay-200" />
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse delay-200" />
          </div>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-full text-muted-foreground border-zinc-700"
          >
            Цуцлах
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center px-2 py-2 sm:p-4 lg:p-8 bg-black fixed inset-0 overflow-hidden">
      {opponentFinishedFirst && !gameOver && opponentFinalScore !== null && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <Card className="bg-red-900/90 border-red-600 p-4 text-center">
            <div className="text-xl font-bold text-white mb-2">Target Score</div>
            <div className="text-3xl font-bold text-yellow-400">{opponentFinalScore}</div>
            <div className="text-sm text-zinc-300 mt-2">
              {score > opponentFinalScore ? "Хожиж байна! 🏆" : "Илүү оноо авах хэрэгтэй!"}
            </div>
          </Card>
        </div>
      )}

      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <Card className="bg-zinc-900/95 border-zinc-700 p-1.5 sm:p-2">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-[10px] sm:text-xs font-bold text-white truncate max-w-[80px]">{opponentName}</div>
            {opponentRank && (
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] font-bold" style={{ color: opponentRank.color }}>
                  {opponentRank.name.split(" ")[0]}
                </span>
              </div>
            )}
          </div>
          <canvas
            ref={opponentCanvasRef}
            width={BOARD_WIDTH * OPPONENT_BLOCK_SIZE}
            height={BOARD_HEIGHT * OPPONENT_BLOCK_SIZE}
            className="border border-zinc-800 rounded w-20 sm:w-24 md:w-28 h-auto"
          />
          <div className="text-[9px] sm:text-xs text-zinc-400 mt-1">
            {opponentState.score} | {opponentState.lines}L
          </div>
          {opponentState.gameOver && <div className="text-[9px] sm:text-xs text-red-500 font-bold mt-1">GAME OVER</div>}
        </Card>
      </div>

      <div className="flex flex-row gap-1 sm:gap-2 lg:gap-4 items-start justify-center w-full max-w-7xl">
        <div className="flex flex-col gap-1 sm:gap-2 lg:gap-4 w-16 sm:w-24 md:w-32 lg:w-52 flex-shrink-0">
          <Card className="p-1 sm:p-2 lg:p-4 bg-zinc-900 border-zinc-600">
            <h2 className="text-[10px] sm:text-xs lg:text-sm font-bold mb-1 sm:mb-2 text-white">Hold</h2>
            <div className="bg-black rounded border border-zinc-800 p-1 sm:p-2 flex items-center justify-center h-14 sm:h-16 lg:h-24">
              {renderPreview(holdPiece, 10)}
            </div>
          </Card>

          <Card className="p-1 sm:p-2 bg-zinc-900 border-zinc-800 text-white space-y-0.5 sm:space-y-1">
            {myRank && myProfile && (
              <div className="mb-1 pb-1 border-b border-zinc-700">
                <div className="text-[9px] font-bold truncate" style={{ color: myRank.color }}>
                  {myRank.name}
                </div>
                <div className="text-[8px] text-zinc-400">{myProfile.battlePoints} BP</div>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] sm:text-xs text-zinc-400">Score</span>
              <span className="text-[11px] sm:text-sm font-bold">{score}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] sm:text-xs text-zinc-400">Lines</span>
              <span className="text-[11px] sm:text-sm font-bold">{lines}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] sm:text-xs text-zinc-400">Time</span>
              <span className="text-[11px] sm:text-sm font-bold">{formatTime(elapsedTime)}</span>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={BOARD_WIDTH * BLOCK_SIZE}
            height={BOARD_HEIGHT * BLOCK_SIZE}
            className="border-2 border-zinc-800 rounded w-[180px] sm:w-[240px] md:w-[300px] lg:w-[360px] xl:w-[420px] h-auto"
            style={{ imageRendering: "pixelated", touchAction: "none" }}
          />

          {gameOver && battleResult && battlePointsChange !== null && (
            <Card className="p-2 sm:p-4 bg-zinc-900 border-zinc-700 text-center">
              <div className="text-2xl sm:text-4xl mb-2">{battleResult === "win" ? "🏆" : "💀"}</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">{battleResult === "win" ? "Хожлоо!" : "Хожигдлоо!"}</h3>
              <div
                className={`text-xl sm:text-2xl font-bold mb-2 ${battlePointsChange > 0 ? "text-green-500" : "text-red-500"}`}
              >
                {battlePointsChange > 0 ? "+" : ""}
                {battlePointsChange} BP
              </div>
              {myRank && myProfile && (
                <div className="text-sm text-zinc-400">
                  <div style={{ color: myRank.color }}>{myRank.name}</div>
                  <div>{myProfile.battlePoints} Battle Points</div>
                </div>
              )}
              <Button onClick={() => router.push("/")} className="mt-4 w-full">
                Буцах
              </Button>
            </Card>
          )}

          <div className="flex flex-col justify-center items-center gap-2 mt-2 md:hidden">
            <div className="flex justify-center gap-1.5 sm:gap-2">
              <Button onClick={moveLeft} className="w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl bg-zinc-700 p-0">
                ◀
              </Button>
              <Button onClick={moveRight} className="w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl bg-zinc-700 p-0">
                ▶
              </Button>
              <Button onClick={moveDown} className="w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl bg-zinc-700 p-0">
                ▼
              </Button>
              <Button onClick={rotatePiece} className="w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl bg-blue-700 p-0">
                ⟳
              </Button>
            </div>
            <div className="flex justify-center gap-1.5 sm:gap-2">
              <Button
                onClick={holdCurrentPiece}
                className="w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl bg-yellow-700 p-0"
              >
                H
              </Button>
              <Button onClick={hardDrop} className="w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl bg-red-700 p-0">
                ⇩
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 sm:gap-2 w-16 sm:w-24 md:w-32 lg:w-52 flex-shrink-0">
          <Card className="p-1 sm:p-2 bg-zinc-900 border-zinc-800">
            <h2 className="text-[10px] sm:text-xs lg:text-sm font-bold mb-1 sm:mb-2 text-white">Next</h2>
            <div className="space-y-1 sm:space-y-2">
              {nextQueue.map((piece, index) => (
                <div
                  key={index}
                  className="bg-black rounded border border-zinc-800 p-0.5 sm:p-1 flex items-center justify-center h-12 sm:h-14"
                >
                  {renderPreview(piece, 8)}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
