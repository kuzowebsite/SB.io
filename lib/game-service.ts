import { db } from "./firebase"
import { collection, addDoc, query, orderBy, limit, getDocs, where, doc, setDoc, getDoc } from "firebase/firestore"
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
    console.error("Error saving game score:", error)
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  } catch (error) {
    console.error("Error updating user profile:", error)
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
    console.error("Error fetching top scores:", error)
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
        bestScore: data.score,
        totalScore: data.score,
        lines: data.lines,
        totalGames: data.score,
        totalXP: data.xp,
        profilePictureURL: data.score,
        date: data.date.toDate(),
      })
    })

    return scores
  } catch (error) {
    console.error("Error fetching user scores:", error)
    return []
  }
}

export async function getTotalPlayers(): Promise<number> {
  try {
    const querySnapshot = await getDocs(collection(db, "users"))
    return querySnapshot.size
  } catch (error) {
    console.error("Error fetching total players:", error)
    return 0
  }
}

export async function getTotalGames(): Promise<number> {
  try {
    const querySnapshot = await getDocs(collection(db, "scores"))
    return querySnapshot.size
  } catch (error) {
    console.error("Error fetching total games:", error)
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
    console.error("Error fetching user profile:", error)
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
    console.error("Error updating user profile data:", error)
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
    console.error("Error fetching online players:", error)
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

export const getLeaderboard = getTopScores
