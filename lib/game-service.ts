import { db } from "./firebase"
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore"
import { ref, onValue, onDisconnect, set, serverTimestamp, get } from "firebase/database"
import { realtimeDb } from "./firebase"
import { calculateXPFromScore } from "./rank-system"

export interface GameScore {
  userId: string
  userName: string
  score: number
  lines: number
  level: number
  pieces: number
  time: number
  xp: number
  date: Date
}

export interface LeaderboardEntry {
  id: string
  userId: string
  userName: string
  bestScore: number
  totalScore: number
  lines: number
  totalGames: number
  totalXP: number
  profilePictureURL?: string
  date: Date
  battlePoints?: number
  battleWins?: number
  battleLosses?: number
}

export interface UserProfile {
  userId: string
  userName: string
  profilePictureURL?: string
  totalXP: number
  totalGames: number
  totalScore: number
  bestScore: number
  totalLines: number
  battlePoints: number // Added battle points for online battles (ELO-style rating)
  battleWins: number // Added battle wins counter
  battleLosses: number // Added battle losses counter
  createdAt: Date
  updatedAt: Date
}

export async function saveGameScore(gameData: GameScore): Promise<void> {
  try {
    // Calculate XP for this game
    const xp = calculateXPFromScore(gameData.score, gameData.lines, gameData.level)

    // Save the game score
    await addDoc(collection(db, "scores"), {
      ...gameData,
      xp,
      date: new Date(),
    })

    // Update user profile
    await updateUserProfile(gameData.userId, gameData.userName, xp, gameData.score, gameData.lines)
  } catch (error) {
    console.error("[v0] Error saving game score:", error)
    throw error
  }
}

async function updateUserProfile(
  userId: string,
  userName: string,
  xpGained: number,
  score: number,
  lines: number,
): Promise<void> {
  const userRef = doc(db, "users", userId)

  try {
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile
      await setDoc(userRef, {
        ...userData,
        totalXP: userData.totalXP + xpGained,
        totalGames: userData.totalGames + 1,
        totalScore: userData.totalScore + score,
        bestScore: Math.max(userData.bestScore, score),
        totalLines: userData.totalLines + lines,
        updatedAt: new Date(),
      })
    } else {
      // Create new user profile
      await setDoc(userRef, {
        userId,
        userName,
        totalXP: xpGained,
        totalGames: 1,
        totalScore: score,
        bestScore: score,
        totalLines: lines,
        battlePoints: 1000, // Initialize battle points at 1000 (like ELO)
        battleWins: 0, // Initialize battle wins
        battleLosses: 0, // Initialize battle losses
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  } catch (error) {
    console.error("[v0] Error updating user profile:", error)
    throw error
  }
}

export async function getTopScores(limitCount = 10): Promise<LeaderboardEntry[]> {
  try {
    const q = query(collection(db, "users"), orderBy("bestScore", "desc"), limit(limitCount))

    const querySnapshot = await getDocs(q)
    const scores: LeaderboardEntry[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile
      scores.push({
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        bestScore: data.bestScore,
        totalScore: data.totalScore,
        lines: data.totalLines,
        totalGames: data.totalGames,
        totalXP: data.totalXP,
        profilePictureURL: data.profilePictureURL,
        date: data.updatedAt,
      })
    })

    return scores
  } catch (error) {
    console.error("[v0] Error fetching top scores:", error)
    return []
  }
}

export async function getUserScores(userId: string, limitCount = 10): Promise<LeaderboardEntry[]> {
  try {
    const q = query(
      collection(db, "scores"),
      where("userId", "==", userId),
      orderBy("score", "desc"),
      limit(limitCount),
    )

    const querySnapshot = await getDocs(q)
    const scores: LeaderboardEntry[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      scores.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        bestScore: data.score, // Placeholder for bestScore, actual value will be fetched later if needed
        totalScore: data.score,
        lines: data.lines,
        totalGames: data.score,
        totalXP: data.xp,
        profilePictureURL: data.score, // Placeholder for profilePictureURL, actual value will be fetched later if needed
        date: data.date.toDate(),
      })
    })

    return scores
  } catch (error) {
    console.error("[v0] Error fetching user scores:", error)
    return []
  }
}

export async function getTotalPlayers(): Promise<number> {
  try {
    const querySnapshot = await getDocs(collection(db, "users"))
    return querySnapshot.size
  } catch (error) {
    console.error("[v0] Error fetching total players:", error)
    return 0
  }
}

export async function getTotalGames(): Promise<number> {
  try {
    const querySnapshot = await getDocs(collection(db, "scores"))
    return querySnapshot.size
  } catch (error) {
    console.error("[v0] Error fetching total games:", error)
    return 0
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      return userDoc.data() as UserProfile
    }
    return null
  } catch (error) {
    console.error("[v0] Error fetching user profile:", error)
    return null
  }
}

export async function updateUserProfileData(
  userId: string,
  updates: Partial<Pick<UserProfile, "userName" | "profilePictureURL">>,
): Promise<void> {
  const userRef = doc(db, "users", userId)

  try {
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      await setDoc(
        userRef,
        {
          ...updates,
          updatedAt: new Date(),
        },
        { merge: true },
      )
    }
  } catch (error) {
    console.error("[v0] Error updating user profile data:", error)
    throw error
  }
}

export function trackUserPresence(userId: string, userName: string): () => void {
  if (typeof window === "undefined") return () => {}

  const userStatusRef = ref(realtimeDb, `status/${userId}`)
  const isOnlineData = {
    state: "online",
    userName,
    lastChanged: serverTimestamp(),
  }

  const isOfflineData = {
    state: "offline",
    userName,
    lastChanged: serverTimestamp(),
  }

  // Set user as online
  set(userStatusRef, isOnlineData)

  // Set user as offline when they disconnect
  onDisconnect(userStatusRef).set(isOfflineData)

  // Cleanup function
  return () => {
    set(userStatusRef, isOfflineData)
  }
}

export async function getOnlinePlayers(): Promise<number> {
  try {
    const statusRef = ref(realtimeDb, "status")
    const snapshot = await get(statusRef)

    if (!snapshot.exists()) {
      return 0
    }

    let onlineCount = 0
    snapshot.forEach((childSnapshot) => {
      const status = childSnapshot.val()
      if (status.state === "online") {
        onlineCount++
      }
    })

    return onlineCount
  } catch (error) {
    console.error("[v0] Error fetching online players:", error)
    return 0
  }
}

export function subscribeToOnlinePlayers(callback: (count: number) => void): () => void {
  const statusRef = ref(realtimeDb, "status")

  const unsubscribe = onValue(statusRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(0)
      return
    }

    let onlineCount = 0
    snapshot.forEach((childSnapshot) => {
      const status = childSnapshot.val()
      if (status.state === "online") {
        onlineCount++
      }
    })

    callback(onlineCount)
  })

  return unsubscribe
}

export async function getBattleRankLeaderboard(limitCount = 20): Promise<LeaderboardEntry[]> {
  try {
    const q = query(collection(db, "users"), orderBy("battlePoints", "desc"), limit(limitCount))

    const querySnapshot = await getDocs(q)
    const scores: LeaderboardEntry[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile
      scores.push({
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        bestScore: data.bestScore,
        totalScore: data.totalScore,
        lines: data.totalLines,
        totalGames: data.totalGames,
        totalXP: data.totalXP,
        profilePictureURL: data.profilePictureURL,
        date: data.updatedAt,
        battlePoints: data.battlePoints || 1000,
        battleWins: data.battleWins || 0,
        battleLosses: data.battleLosses || 0,
      })
    })

    return scores
  } catch (error) {
    console.error("[v0] Error fetching battle rank leaderboard:", error)
    return []
  }
}

export function calculateBattlePointsChange(
  winner: {
    battlePoints: number
    score: number
    lines: number
    timeAlive: number
  },
  loser: {
    battlePoints: number
    score: number
    lines: number
    timeAlive: number
  },
): { winnerChange: number; loserChange: number } {
  // Base K-factor (maximum points that can be gained/lost)
  const K = 32

  // Calculate expected win probability using ELO formula
  const expectedWinner = 1 / (1 + Math.pow(10, (loser.battlePoints - winner.battlePoints) / 400))
  const expectedLoser = 1 - expectedWinner

  // Base points change
  let winnerChange = Math.round(K * (1 - expectedWinner))
  let loserChange = Math.round(K * (0 - expectedLoser))

  // Performance bonus for winner (based on how well they played)
  const performanceBonus = Math.min(10, Math.floor((winner.score - loser.score) / 1000))
  winnerChange += performanceBonus

  // Reduce loss if loser performed well (lasted long, scored points)
  const loserPerformance = Math.min(5, Math.floor(loser.timeAlive / 30)) // 1 point per 30 seconds
  loserChange += loserPerformance // Make loss less severe

  // Ensure minimum changes
  winnerChange = Math.max(10, winnerChange)
  loserChange = Math.max(-25, loserChange)

  return { winnerChange, loserChange }
}

export async function updateBattleResult(
  winnerId: string,
  loserId: string,
  battleData: {
    winnerScore: number
    winnerLines: number
    winnerTime: number
    loserScore: number
    loserLines: number
    loserTime: number
  },
): Promise<void> {
  try {
    const winnerRef = doc(db, "users", winnerId)
    const loserRef = doc(db, "users", loserId)

    const [winnerDoc, loserDoc] = await Promise.all([getDoc(winnerRef), getDoc(loserRef)])

    if (!winnerDoc.exists() || !loserDoc.exists()) {
      throw new Error("User profiles not found")
    }

    const winnerData = winnerDoc.data() as UserProfile
    const loserData = loserDoc.data() as UserProfile

    // Calculate points change
    const { winnerChange, loserChange } = calculateBattlePointsChange(
      {
        battlePoints: winnerData.battlePoints || 1000,
        score: battleData.winnerScore,
        lines: battleData.winnerLines,
        timeAlive: battleData.winnerTime,
      },
      {
        battlePoints: loserData.battlePoints || 1000,
        score: battleData.loserScore,
        lines: battleData.loserLines,
        timeAlive: battleData.loserTime,
      },
    )

    // Update winner
    await setDoc(
      winnerRef,
      {
        battlePoints: (winnerData.battlePoints || 1000) + winnerChange,
        battleWins: (winnerData.battleWins || 0) + 1,
        updatedAt: new Date(),
      },
      { merge: true },
    )

    // Update loser
    await setDoc(
      loserRef,
      {
        battlePoints: Math.max(0, (loserData.battlePoints || 1000) + loserChange), // Don't go below 0
        battleLosses: (loserData.battleLosses || 0) + 1,
        updatedAt: new Date(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[v0] Error updating battle result:", error)
    throw error
  }
}

export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  try {
    if (!searchTerm.trim()) return []

    const usersRef = collection(db, "users")
    const querySnapshot = await getDocs(usersRef)

    const users: UserProfile[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserProfile
      const userName = data.userName?.toLowerCase() || ""
      const search = searchTerm.toLowerCase()

      if (userName.includes(search)) {
        users.push(data)
      }
    })

    return users.slice(0, 20) // Limit to 20 results
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}

export async function deleteFriend(userId: string, friendId: string): Promise<void> {
  try {
    // Find and delete the friend request document
    const q1 = query(
      collection(db, "friendRequests"),
      where("fromId", "==", userId),
      where("toId", "==", friendId),
      where("status", "==", "accepted"),
    )
    const q2 = query(
      collection(db, "friendRequests"),
      where("fromId", "==", friendId),
      where("toId", "==", userId),
      where("status", "==", "accepted"),
    )

    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)])

    const deletePromises: Promise<void>[] = []
    snapshot1.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref))
    })
    snapshot2.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref))
    })

    await Promise.all(deletePromises)
  } catch (error) {
    console.error("Error deleting friend:", error)
    throw error
  }
}
