"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { db, realtimeDb } from "@/lib/firebase"
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
import { ref, set, onValue, remove } from "firebase/database"
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

interface LockedCell {
  x: number
  y: number
  color: string
}

interface GameStateSync {
  score: number
  lines: number
  level: number
  gameOver: boolean
  surrendered: boolean
  currentPieceType: TetrominoType | null
  position: Position
  lockedCells: LockedCell[]
  finishTime: number | null
  lastUpdate: number
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
  const [lockedCells, setLockedCells] = useState<LockedCell[]>([])
  const [currentPiece, setCurrentPiece] = useState<Tetromino>(getRandomTetromino())
  const [nextQueue, setNextQueue] = useState<Tetromino[]>(generateQueue(5))
  const [holdPiece, setHoldPiece] = useState<Tetromino | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [position, setPosition] = useState<Position>({ x: 3, y: 0 })
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [finishTime, setFinishTime] = useState<number | null>(null)
  const elapsedTimeRef = useRef(0)
  const [, forceUpdate] = useState(0)
  const [clearingLines, setClearingLines] = useState<number[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [surrendered, setSurrendered] = useState(false)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)

  const [opponentState, setOpponentState] = useState<GameStateSync>({
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    surrendered: false,
    currentPieceType: null,
    position: { x: 0, y: 0 },
    lockedCells: [],
    finishTime: null,
    lastUpdate: 0,
  })

  const [opponentFinishedFirst, setOpponentFinishedFirst] = useState(false)
  const [opponentFinalScore, setOpponentFinalScore] = useState<number | null>(null)

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

  const handleSurrender = useCallback(() => {
    if (gameOver || surrendered) return
    console.log("[v0] Player surrendered")
    setSurrendered(true)
    setGameOver(true)
    setFinishTime(Date.now())
    playGameOverSound()
  }, [gameOver, surrendered, playGameOverSound])

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  useEffect(() => {
    console.log("[v0] Component mounted", { user: !!user, loading, db: !!db, realtimeDb: !!realtimeDb })

    if (!user) {
      console.log("[v0] No user found")
      return
    }

    if (!db || !realtimeDb) {
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
          console.log("[v0] User profile loaded:", { battlePoints: profile.battlePoints, rank: rank.name })
        }
      } catch (err) {
        console.error("[v0] Error loading user profile:", err)
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
    if (!user || !matchmaking || loading || !db) return

    let matchmakingDoc: string | null = null
    let unsubscribe: (() => void) | null = null

    const findMatch = async () => {
      try {
        console.log("[v0] Starting matchmaking")
        const q = query(collection(db, "matchmaking"), where("status", "==", "waiting"))
        const snapshot = await getDocs(q)
        const availableMatches = snapshot.docs.filter((doc) => doc.data().playerId !== user.uid)

        if (availableMatches.length > 0) {
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
          console.log("[v0] Matched with:", matchData.playerName)
        } else {
          const docRef = await addDoc(collection(db, "matchmaking"), {
            playerId: user.uid,
            playerName: user.displayName || user.email || "Player 1",
            player2Id: null,
            player2Name: null,
            status: "waiting",
            createdAt: serverTimestamp(),
          })

          matchmakingDoc = docRef.id

          unsubscribe = onSnapshot(doc(db, "matchmaking", docRef.id), (doc) => {
            const data = doc.data()
            if (data && data.status === "matched" && data.player2Id) {
              setMatchId(docRef.id)
              setOpponentId(data.player2Id)
              setOpponentName(data.player2Name)
              setMatchmaking(false)
              console.log("[v0] Opponent found:", data.player2Name)
            }
          })
        }
      } catch (err) {
        console.error("[v0] Matchmaking error:", err)
        setError("Өрсөлдөгч хайхад алдаа гарлаа")
      }
    }

    findMatch()

    return () => {
      if (unsubscribe) unsubscribe()
      if (matchmakingDoc) {
        deleteDoc(doc(db, "matchmaking", matchmakingDoc)).catch(console.error)
      }
    }
  }, [user, matchmaking, loading])

  useEffect(() => {
    if (!matchId || !user || !realtimeDb) return

    const gameStateData: GameStateSync = {
      score,
      lines,
      level,
      gameOver,
      surrendered,
      currentPieceType: currentPiece?.type || null,
      position,
      lockedCells,
      finishTime,
      lastUpdate: Date.now(),
    }

    const gameRef = ref(realtimeDb, `battles/${matchId}/${user.uid}`)
    set(gameRef, gameStateData).catch((err) => {
      console.error("[v0] Error syncing game state:", err)
    })
  }, [matchId, user, score, lines, level, gameOver, surrendered, currentPiece, position, lockedCells, finishTime])

  useEffect(() => {
    if (!matchId || !opponentId || !realtimeDb) return

    console.log("[v0] Setting up real-time opponent listener")
    const opponentRef = ref(realtimeDb, `battles/${matchId}/${opponentId}`)

    const unsubscribe = onValue(
      opponentRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setOpponentState({
            score: data.score || 0,
            lines: data.lines || 0,
            level: data.level || 1,
            gameOver: data.gameOver || false,
            surrendered: data.surrendered || false,
            currentPieceType: data.currentPieceType || null,
            position: data.position || { x: 0, y: 0 },
            lockedCells: data.lockedCells || [],
            finishTime: data.finishTime || null,
            lastUpdate: data.lastUpdate || 0,
          })
        }
      },
      (err) => {
        console.error("[v0] Error listening to opponent:", err)
      },
    )

    return () => {
      console.log("[v0] Cleaning up opponent listener")
      unsubscribe()
    }
  }, [matchId, opponentId])

  useEffect(() => {
    if (!gameOver || !opponentState.gameOver || !user || !opponentId || battleResult !== null) return

    const updateResult = async () => {
      try {
        console.log("[v0] Both players finished, calculating result")

        let iWon: boolean

        // If either player surrendered, they lose
        if (surrendered) {
          iWon = false
          console.log("[v0] I surrendered, I lose")
        } else if (opponentState.surrendered) {
          iWon = true
          console.log("[v0] Opponent surrendered, I win")
        } else if (score !== opponentState.score) {
          // Different scores - higher score wins
          iWon = score > opponentState.score
          console.log("[v0] Different scores:", { myScore: score, opponentScore: opponentState.score, iWon })
        } else {
          const myTime = finishTime ? finishTime - startTime : Number.POSITIVE_INFINITY
          const opponentTime = opponentState.finishTime
            ? opponentState.finishTime - startTime
            : Number.POSITIVE_INFINITY

          iWon = myTime < opponentTime

          const myTimeSeconds = Math.floor(myTime / 1000)
          const opponentTimeSeconds = Math.floor(opponentTime / 1000)

          console.log("[v0] SCORE TIE - Comparing times:", {
            score,
            myTime: `${Math.floor(myTimeSeconds / 60)}:${(myTimeSeconds % 60).toString().padStart(2, "0")}`,
            opponentTime: `${Math.floor(opponentTimeSeconds / 60)}:${(opponentTimeSeconds % 60).toString().padStart(2, "0")}`,
            myTimeMs: myTime,
            opponentTimeMs: opponentTime,
            iWon: iWon ? "I was faster, I WIN" : "Opponent was faster, I LOSE",
          })
        }

        console.log("[v0] Battle result:", { iWon, myScore: score, opponentScore: opponentState.score })

        setBattleResult(iWon ? "win" : "loss")

        const myTime = finishTime ? Math.floor((finishTime - startTime) / 1000) : 0
        const opponentTime = opponentState.finishTime ? Math.floor((opponentState.finishTime - startTime) / 1000) : 0

        await updateBattleResult(iWon ? user.uid : opponentId, iWon ? opponentId : user.uid, {
          winnerScore: iWon ? score : opponentState.score,
          winnerLines: iWon ? lines : opponentState.lines,
          winnerTime: iWon ? myTime : opponentTime,
          loserScore: iWon ? opponentState.score : score,
          loserLines: iWon ? opponentState.lines : lines,
          loserTime: iWon ? opponentTime : myTime,
        })

        // Get updated profile to calculate points change
        const updatedProfile = await getUserProfile(user.uid)
        if (updatedProfile && myProfile) {
          const pointsChange = updatedProfile.battlePoints - myProfile.battlePoints
          setBattlePointsChange(pointsChange)
          setMyProfile(updatedProfile)
          const newRank = getRankByBattlePoints(updatedProfile.battlePoints || 1000)
          setMyRank(newRank)
          console.log("[v0] Battle points updated:", {
            oldPoints: myProfile.battlePoints,
            newPoints: updatedProfile.battlePoints,
            change: pointsChange,
          })
        }
      } catch (err) {
        console.error("[v0] Error updating battle result:", err)
      }
    }

    updateResult()
  }, [
    gameOver,
    opponentState.gameOver,
    opponentState.surrendered,
    user,
    opponentId,
    score,
    opponentState.score,
    surrendered,
    finishTime,
    startTime,
    battleResult,
    myProfile,
    lines,
    opponentState.lines,
    opponentState.finishTime,
  ])

  useEffect(() => {
    return () => {
      if (matchId && user && realtimeDb) {
        const gameRef = ref(realtimeDb, `battles/${matchId}/${user.uid}`)
        remove(gameRef).catch(console.error)
      }
    }
  }, [matchId, user])

  useEffect(() => {
    if (gameOver && !opponentState.gameOver && !waitingForOpponent) {
      console.log("[v0] I finished first, waiting for opponent")
      setWaitingForOpponent(true)
    }
  }, [gameOver, opponentState.gameOver, waitingForOpponent])

  useEffect(() => {
    if (opponentState.gameOver && !gameOver && !opponentFinishedFirst) {
      console.log("[v0] Opponent finished first with score:", opponentState.score)
      setOpponentFinishedFirst(true)
      setOpponentFinalScore(opponentState.score)
    }
  }, [opponentState.gameOver, opponentState.score, gameOver, opponentFinishedFirst])

  useEffect(() => {
    if (waitingForOpponent && opponentState.gameOver && opponentState.score > score) {
      console.log("[v0] Opponent surpassed my score, I lose")
      // Game already over, just clear waiting state
      setWaitingForOpponent(false)
    }
  }, [waitingForOpponent, opponentState.gameOver, opponentState.score, score])

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
      const newLockedCells: LockedCell[] = []

      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = actualPos.y + y
            const boardX = actualPos.x + x
            if (boardY >= 0) {
              newBoard[boardY][boardX] = 1
              newColors[boardY][boardX] = currentPiece.color
              newLockedCells.push({ x: boardX, y: boardY, color: currentPiece.color })
            }
          }
        }
      }

      boardColors.current = newColors
      setBoard(newBoard)
      setLockedCells((prev) => [...prev, ...newLockedCells])
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

        setLockedCells((prev) => {
          const filtered = prev.filter((cell) => !linesToClear.includes(cell.y))
          return filtered.map((cell) => {
            const linesBelow = linesToClear.filter((line) => line > cell.y).length
            return { ...cell, y: cell.y + linesBelow }
          })
        })

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

    if (holdPiece === null) {
      setHoldPiece(currentPiece)
      const newPiece = nextQueue[0]
      setNextQueue((prev) => [...prev.slice(1), getRandomTetromino()])
      setCurrentPiece(newPiece)
      setPosition({ x: 3, y: 0 })
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
        setFinishTime(Date.now())
        playGameOverSound()
      } else {
        setCurrentPiece(newPiece)
        setPosition(startPos)
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
    const newPos = { x: position.x - 1, y: position.y }
    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos)
    }
  }, [position, currentPiece, checkCollision, gameOver, isClearing])

  const moveRight = useCallback(() => {
    if (gameOver || isClearing) return
    const newPos = { x: position.x + 1, y: position.y }
    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos)
    }
  }, [position, currentPiece, checkCollision, gameOver, isClearing])

  const hardDrop = useCallback(() => {
    if (gameOver || isClearing) return

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
      setFinishTime(Date.now())
      playGameOverSound()
    } else {
      setCurrentPiece(newPiece)
      setPosition(startPos)
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

    let rafId: number
    const updateTime = () => {
      elapsedTimeRef.current = Math.floor((Date.now() - startTime) / 1000)
      forceUpdate((n) => n + 1)
      rafId = requestAnimationFrame(updateTime)
    }

    rafId = requestAnimationFrame(updateTime)
    return () => cancelAnimationFrame(rafId)
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

  const formatTime = () => {
    const totalMs = Date.now() - startTime
    const seconds = Math.floor(totalMs / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    const ms = Math.floor((totalMs % 1000) / 10)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
    } else {
      return `${secs}.${ms.toString().padStart(2, "0")}s`
    }
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

      // Draw locked cells (placed blocks) on my board
      lockedCells.forEach((cell) => {
        ctx.fillStyle = cell.color
        ctx.fillRect(cell.x * BLOCK_SIZE, cell.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
        ctx.lineWidth = 2
        ctx.strokeRect(cell.x * BLOCK_SIZE, cell.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
      })

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
  }, [board, currentPiece, position, gameOver, isClearing, checkCollision, lockedCells]) // Added lockedCells dependency

  useEffect(() => {
    const canvas = opponentCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const render = () => {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
      ctx.lineWidth = 1
      for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * OPPONENT_BLOCK_SIZE)
        ctx.lineTo(BOARD_WIDTH * OPPONENT_BLOCK_SIZE, y * OPPONENT_BLOCK_SIZE)
        ctx.stroke()
      }
      for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath()
        ctx.moveTo(x * OPPONENT_BLOCK_SIZE, 0)
        ctx.lineTo(x * OPPONENT_BLOCK_SIZE, BOARD_HEIGHT * OPPONENT_BLOCK_SIZE)
        ctx.stroke()
      }

      opponentState.lockedCells.forEach((cell) => {
        ctx.fillStyle = cell.color
        ctx.fillRect(
          cell.x * OPPONENT_BLOCK_SIZE,
          cell.y * OPPONENT_BLOCK_SIZE,
          OPPONENT_BLOCK_SIZE,
          OPPONENT_BLOCK_SIZE,
        )
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
        ctx.lineWidth = 1
        ctx.strokeRect(
          cell.x * OPPONENT_BLOCK_SIZE,
          cell.y * OPPONENT_BLOCK_SIZE,
          OPPONENT_BLOCK_SIZE,
          OPPONENT_BLOCK_SIZE,
        )
      })

      // Draw opponent's current piece
      if (opponentState.currentPieceType && !opponentState.gameOver) {
        const piece = { ...TETROMINOS[opponentState.currentPieceType], type: opponentState.currentPieceType }
        for (let y = 0; y < piece.shape.length; y++) {
          for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
              const boardX = opponentState.position.x + x
              const boardY = opponentState.position.y + y
              if (boardY >= 0) {
                ctx.fillStyle = piece.color
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
      {waitingForOpponent && !opponentState.gameOver && (
        <div className="fixed top-16 left-2 sm:top-20 sm:left-4 z-40">
          <Card className="bg-blue-900/95 border-blue-600 p-2 sm:p-3">
            <div className="text-xs sm:text-sm font-bold text-white mb-1">Хүлээж байна...</div>
            <div className="text-lg sm:text-xl font-bold text-yellow-400">{score}</div>
            <div className="text-[10px] sm:text-xs text-zinc-300 mt-1">Таны оноо</div>
            <div className="text-[9px] sm:text-xs text-zinc-400">Өрсөлдөгч: {opponentState.score}</div>
          </Card>
        </div>
      )}

      {opponentFinishedFirst && !gameOver && opponentFinalScore !== null && (
        <div className="fixed top-16 left-2 sm:top-20 sm:left-4 z-40">
          <Card className="bg-orange-900/95 border-orange-600 p-2 sm:p-3">
            <div className="text-xs sm:text-sm font-bold text-white mb-1">Target</div>
            <div className="text-lg sm:text-xl font-bold text-yellow-400">{opponentFinalScore}</div>
            <div className="text-[10px] sm:text-xs text-zinc-300 mt-1">
              {score > opponentFinalScore ? "🏆 Хожиж байна!" : "⬆️ Илүү оноо хэрэгтэй"}
            </div>
          </Card>
        </div>
      )}

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
              <span className="text-[11px] sm:text-sm font-bold">{formatTime()}</span>
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
          {!gameOver && !surrendered && (
            <Button onClick={handleSurrender} variant="destructive" className="w-full text-xs sm:text-sm">
              Бууж өгөх
            </Button>
          )}

          {gameOver && battleResult && battlePointsChange !== null && (
            <Card className="p-2 sm:p-4 bg-zinc-900 border-zinc-700 text-center">
              <div className="text-2xl sm:text-4xl mb-2">
                {surrendered ? "🏳️" : opponentState.surrendered ? "🏆" : battleResult === "win" ? "🏆" : "💀"}
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">
                {surrendered
                  ? "Бууж өгсөн"
                  : opponentState.surrendered
                    ? "Өрсөлдөгч бууж өгсөн!"
                    : battleResult === "win"
                      ? "Хожлоо!"
                      : "Хожигдлоо!"}
              </h3>
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

          <Card className="p-1 sm:p-2 bg-zinc-900 border-zinc-800">
            <h2 className="text-[10px] sm:text-xs lg:text-sm font-bold mb-1 sm:mb-2 text-white">
              {opponentName || "Өрсөлдөгч"}
            </h2>
            {opponentRank && opponentProfile && (
              <div className="mb-1 pb-1 border-b border-zinc-700">
                <div className="text-[9px] font-bold truncate" style={{ color: opponentRank.color }}>
                  {opponentRank.name}
                </div>
                <div className="text-[8px] text-zinc-400">{opponentProfile.battlePoints} BP</div>
              </div>
            )}
            <div className="bg-black rounded border border-zinc-800 p-0.5 sm:p-1 mb-1 sm:mb-2 flex items-center justify-center">
              <canvas
                ref={opponentCanvasRef}
                width={BOARD_WIDTH * OPPONENT_BLOCK_SIZE}
                height={BOARD_HEIGHT * OPPONENT_BLOCK_SIZE}
                className="w-full h-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="space-y-0.5 sm:space-y-1 text-white">
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] sm:text-xs text-zinc-400">Score</span>
                <span className="text-[11px] sm:text-sm font-bold">{opponentState.score}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] sm:text-xs text-zinc-400">Lines</span>
                <span className="text-[11px] sm:text-sm font-bold">{opponentState.lines}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] sm:text-xs text-zinc-400">Level</span>
                <span className="text-[11px] sm:text-sm font-bold">{opponentState.level}</span>
              </div>
              {opponentState.gameOver && (
                <div className="text-[10px] sm:text-xs text-red-500 font-bold text-center mt-1">
                  {opponentState.surrendered ? "Бууж өгсөн" : "Дууссан"}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
