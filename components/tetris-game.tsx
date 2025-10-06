"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { saveGameScore } from "@/lib/game-service"
import Leaderboard from "@/components/leaderboard"

const BLOCK_SIZE = 30
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

function generateQueue(count: number): Tetromino[] {
  return Array.from({ length: count }, () => getRandomTetromino())
}

export default function TetrisGame() {
  const router = useRouter()
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [board, setBoard] = useState<number[][]>(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState<Tetromino>(getRandomTetromino())
  const [nextQueue, setNextQueue] = useState<Tetromino[]>(generateQueue(5))
  const [holdPiece, setHoldPiece] = useState<Tetromino | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [position, setPosition] = useState<Position>({ x: 3, y: 0 })
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [level, setLevel] = useState(1)
  const [pieces, setPieces] = useState(0)
  const [inputs, setInputs] = useState(0)
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [clearingLines, setClearingLines] = useState<number[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const [isSavingScore, setIsSavingScore] = useState(false)
  const [scoreSaved, setScoreSaved] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const boardColors = useRef<string[][]>(Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill("")))
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

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

  useEffect(() => {
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    const preventDoubleTapZoom = (e: TouchEvent) => {
      e.preventDefault()
    }

    document.addEventListener("touchmove", preventZoom, { passive: false })
    document.addEventListener("touchstart", preventDoubleTapZoom, { passive: false })

    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
      document.removeEventListener("touchmove", preventZoom)
      document.removeEventListener("touchstart", preventDoubleTapZoom)
    }
  }, [])

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

  const rotateCounterClockwise = useCallback(() => {
    if (gameOver || isClearing) return
    setInputs((prev) => prev + 1)

    const rotated = currentPiece.shape[0].map((_, i) => currentPiece.shape.map((row) => row[row.length - 1 - i]))

    const rotatedPiece = { ...currentPiece, shape: rotated }

    if (!checkCollision(rotatedPiece, position)) {
      setCurrentPiece(rotatedPiece)
    }
  }, [currentPiece, position, checkCollision, gameOver, isClearing])

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
      } else {
        setCurrentPiece(newPiece)
        setPosition(startPos)
        setPieces((prev) => prev + 1)
        setCanHold(true)
      }
    }
  }, [position, currentPiece, nextQueue, checkCollision, mergePiece, clearLines, gameOver, isClearing])

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
    } else {
      setCurrentPiece(newPiece)
      setPosition(startPos)
      setPieces((prev) => prev + 1)
      setCanHold(true)
    }
  }, [position, currentPiece, nextQueue, checkCollision, mergePiece, clearLines, gameOver, isClearing])

  const resetGame = () => {
    setBoard(createEmptyBoard())
    boardColors.current = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(""))
    setCurrentPiece(getRandomTetromino())
    setNextQueue(generateQueue(5))
    setHoldPiece(null)
    setCanHold(true)
    setPosition({ x: 3, y: 0 })
    setScore(0)
    setLines(0)
    setLevel(1)
    setPieces(0)
    setInputs(0)
    setStartTime(Date.now())
    setElapsedTime(0)
    setGameOver(false)
    setClearingLines([])
    setIsClearing(false)
    setScoreSaved(false)
    setIsSavingScore(false)
  }

  useEffect(() => {
    if (gameOver) return
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, gameOver])

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (gameOver) return
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (gameOver || !touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      const threshold = 30

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            moveRight()
          } else {
            moveLeft()
          }
        }
      } else {
        if (deltaY > threshold) {
          moveDown()
        } else if (deltaY < -threshold) {
          rotatePiece()
        }
      }

      touchStartRef.current = null
    }

    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener("touchstart", handleTouchStart)
      canvas.addEventListener("touchend", handleTouchEnd)

      return () => {
        canvas.removeEventListener("touchstart", handleTouchStart)
        canvas.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [gameOver, moveLeft, moveRight, moveDown, rotatePiece])

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
        case "z":
        case "Z":
          e.preventDefault()
          rotateCounterClockwise()
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
  }, [moveLeft, moveRight, moveDown, rotatePiece, rotateCounterClockwise, hardDrop, holdCurrentPiece, gameOver])

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
                  boxShadow: "inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3)",
                }}
              />
            ) : null,
          ),
        )}
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
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

            const isClearing = clearingLines.includes(y)

            if (isClearing) {
              ctx.save()

              const pulseIntensity = Math.sin(Date.now() / 100) * 0.5 + 0.5
              ctx.shadowColor = "#ffffff"
              ctx.shadowBlur = 20 + pulseIntensity * 20
              ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + pulseIntensity * 0.3})`
              ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)

              ctx.strokeStyle = "#00ffff"
              ctx.lineWidth = 2
              ctx.shadowColor = "#00ffff"
              ctx.shadowBlur = 15

              for (let i = 0; i < 3; i++) {
                ctx.beginPath()
                const startX = x * BLOCK_SIZE + Math.random() * BLOCK_SIZE
                const startY = y * BLOCK_SIZE + Math.random() * BLOCK_SIZE
                ctx.moveTo(startX, startY)

                const segments = 3
                for (let j = 0; j < segments; j++) {
                  const endX = startX + (Math.random() - 0.5) * BLOCK_SIZE
                  const endY = startY + (Math.random() - 0.5) * BLOCK_SIZE
                  ctx.lineTo(endX, endY)
                }
                ctx.stroke()
              }

              ctx.restore()
            } else {
              ctx.fillStyle = color
              ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)

              ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
              ctx.lineWidth = 2
              ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)

              ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
              ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 4)

              ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
              ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + BLOCK_SIZE - 6, BLOCK_SIZE - 4, 4)
            }
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
                ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
                ctx.lineWidth = 1
                ctx.strokeRect(boardX * BLOCK_SIZE, boardY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
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

                ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
                ctx.fillRect(boardX * BLOCK_SIZE + 2, boardY * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 4)

                ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
                ctx.fillRect(boardX * BLOCK_SIZE + 2, boardY * BLOCK_SIZE + BLOCK_SIZE - 6, BLOCK_SIZE - 4, 4)
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
  }, [board, currentPiece, position, gameOver, clearingLines, isClearing, checkCollision])

  useEffect(() => {
    if (gameOver && !scoreSaved && !isSavingScore && user && score > 0) {
      setIsSavingScore(true)
      saveGameScore({
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        score,
        lines,
        level,
        pieces,
        time: elapsedTime,
        date: new Date(),
        xp: 0,
      })
        .then(() => {
          setScoreSaved(true)
        })
        .catch((error) => {
          console.error("Failed to save score:", error)
        })
        .finally(() => {
          setIsSavingScore(false)
        })
    }
  }, [gameOver, scoreSaved, isSavingScore, user, score, lines, level, pieces, elapsedTime])

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center px-2 py-2 sm:p-2 lg:p-8 bg-black fixed inset-0 overflow-hidden select-none">
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}

      <div className="flex flex-row gap-0.5 sm:gap-2 lg:gap-4 items-start justify-center w-full max-w-7xl">
        <div className="flex flex-col gap-1 sm:gap-2 lg:gap-4 w-14 sm:w-32 lg:w-52 flex-shrink-0 translate-x-8 sm:translate-x-0">
          <Card className="w-20 sm:w-24 lg:w-32 p-1 sm:p-2 lg:p-4 bg-zinc-900 border-zinc-600">
            <h2 className="text-[9px] sm:text-xs lg:text-sm font-bold mb-1 sm:mb-2 lg:mb-3 text-white uppercase tracking-wider">
              Hold
            </h2>
            <div className="bg-black rounded border border-zinc-800 p-1 sm:p-2 lg:p-4 flex items-center justify-center h-12 sm:h-16 lg:h-24">
              {renderPreview(holdPiece, window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 12 : 14)}
            </div>
          </Card>

          <Card className="w-20 sm:w-24 lg:w-32 p-1 sm:p-2 lg:p-4 bg-zinc-900 border-zinc-800 text-white space-y-1 sm:space-y-2 lg:space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-[8px] sm:text-xs text-zinc-400 uppercase">Inputs: </span>
              <span className="text-[8px] sm:text-sm lg:text-lg font-bold">{inputs}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[8px] sm:text-xs text-zinc-600 uppercase">Pieces: </span>
              <span className="text-[8px] sm:text-sm lg:text-lg font-bold">
                {pieces}. {elapsedTime > 0 ? (pieces / elapsedTime).toFixed(1) : "0.0"}/s
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[8px] sm:text-xs text-zinc-600 uppercase">Lines: </span>
              <span className="text-[8px] sm:text-sm lg:text-lg font-bold">
                {lines}/{lines + 40}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[8px] sm:text-xs text-zinc-600 uppercase">Time: </span>
              <span className="text-[8px] sm:text-sm lg:text-lg font-bold">{formatTime(elapsedTime)}</span>
            </div>
          </Card>
          <Button
            onClick={() => setShowLeaderboard(true)}
            variant="outline"
            className="w-20 sm:w-24 lg:w-32 text-[9px] sm:text-sm bg-yellow-800 border-yellow-700 text-white hover:bg-yellow-700 active:bg-yellow-600 py-1 touch-manipulation pointer-events-auto"
          >
            Тэргүүлэгчид
          </Button>
          {!gameOver && (
            <Button
              onClick={resetGame}
              variant="outline"
              className="w-20 sm:w-24 lg:w-32 text-[9px] sm:text-sm bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 active:bg-zinc-600 py-1 touch-manipulation pointer-events-auto"
            >
              Шинэ тоглоом
            </Button>
          )}
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-20 sm:w-24 lg:w-32 text-[9px] sm:text-sm bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 active:bg-zinc-600 py-1 touch-manipulation pointer-events-auto"
          >
            Гарах
          </Button>
        </div>

        <div className="flex flex-col gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
          <div className="flex justify-center mb-26 relative">
            <canvas
              ref={canvasRef}
              width={BOARD_WIDTH * BLOCK_SIZE}
              height={BOARD_HEIGHT * BLOCK_SIZE}
              className="border-2 border-zinc-800 rounded w-[130px] sm:w-[240px] lg:w-[300px] h-auto touch-none"
              style={{ imageRendering: "pixelated", touchAction: "none" }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="text-3xl sm:text-6xl lg:text-9xl font-bold text-zinc-800/50">{score}</div>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center gap-2 mt-2 sm:mt-4 lg:hidden transform translate-y-10 relative z-10">
            <div className="flex justify-center gap-2">
              <Button
                onClick={moveLeft}
                className="w-16 h-16 text-2xl bg-zinc-700 hover:bg-zinc-600 touch-manipulation active:bg-zinc-500 pointer-events-auto"
                style={{ touchAction: "manipulation" }}
              >
                ◀
              </Button>
              <Button
                onClick={moveRight}
                className="w-16 h-16 text-2xl bg-zinc-700 hover:bg-zinc-600 touch-manipulation active:bg-zinc-500 pointer-events-auto"
                style={{ touchAction: "manipulation" }}
              >
                ▶
              </Button>
              <Button
                onClick={moveDown}
                className="w-16 h-16 text-2xl bg-zinc-700 hover:bg-zinc-600 touch-manipulation active:bg-zinc-500 pointer-events-auto"
                style={{ touchAction: "manipulation" }}
              >
                ▼
              </Button>
              <Button
                onClick={rotatePiece}
                className="w-16 h-16 text-2xl bg-blue-700 hover:bg-blue-600 touch-manipulation active:bg-blue-500 pointer-events-auto"
                style={{ touchAction: "manipulation" }}
              >
                ⟳
              </Button>
            </div>
            <div className="flex justify-center gap-2">
              <Button
                onClick={holdCurrentPiece}
                className="w-16 h-16 text-2xl bg-yellow-700 hover:bg-yellow-600 touch-manipulation active:bg-yellow-500 pointer-events-auto"
                style={{ touchAction: "manipulation" }}
              >
                H
              </Button>
              <Button
                onClick={hardDrop}
                className="w-16 h-16 text-2xl bg-red-700 hover:bg-red-600 touch-manipulation active:bg-red-500 pointer-events-auto"
                style={{ touchAction: "manipulation" }}
              >
                ⇩
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 sm:gap-2 lg:gap-4 w-14 sm:w-32 lg:w-52 flex-shrink-0">
          <Card className="w-20 sm:w-24 lg:w-32 p-1 sm:p-2 lg:p-3 bg-zinc-900 border-zinc-800 -translate-x-11 sm:translate-x-0">
            <h2 className="text-[9px] sm:text-xs lg:text-sm font-bold mb-1 sm:mb-2 lg:mb-3 text-white uppercase tracking-wider">
              Next
            </h2>
            <div className="space-y-1 sm:space-y-2 lg:space-y-3">
              {nextQueue.map((piece, index) => (
                <div
                  key={index}
                  className="bg-black rounded border border-zinc-800 p-1 sm:p-2 lg:p-3 flex items-center justify-center h-10 sm:h-14 lg:h-20"
                >
                  {renderPreview(piece, window.innerWidth < 640 ? 7 : window.innerWidth < 1024 ? 10 : 12)}
                </div>
              ))}
            </div>
          </Card>

          {gameOver && (
            <Card className="w-20 sm:w-24 lg:w-32 p-2 sm:p-3 lg:p-4 bg-red-950/50 border-red-900 sm:translate-x-0 -translate-x-11">
              <h2 className="text-[10px] font-bold text-red-500 -mb-5">Дууссан!</h2>
              <p className="text-[9px] sm:text-sm text-white mb-2 sm:mb-3 lg:mb-1">Оноо: {score}</p>
              {isSavingScore && <p className="text-[6px] sm:text-xs text-yellow-400">Оноо хадгалж байна...</p>}
              {scoreSaved && <p className="text-[6px] sm:text-xs text-green-400 -mb-4">Оноо хадгалагдлаа!</p>}
              <Button
                onClick={resetGame}
                className="w-full text-[6px] sm:text-sm bg-red-600 hover:bg-red-700 active:bg-red-800 py-1 touch-manipulation pointer-events-auto"
                style={{ touchAction: "manipulation" }}
              >
                Нахих
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
