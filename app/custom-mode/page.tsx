"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { db, realtimeDb } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from "firebase/firestore"
import { ref, onValue, off } from "firebase/database"
import { Copy, Users, Check, X, Gamepad2, LinkIcon, Search, Trash2, Eye, UserPlus, Mail } from "lucide-react"
import { searchUsers, deleteFriend, type UserProfile } from "@/lib/game-service"
import UserProfileModal from "@/components/user-profile-modal"

interface FriendRequest {
  id: string
  fromId: string
  fromName: string
  toId: string
  toName: string
  status: "pending" | "accepted" | "rejected"
  createdAt: any
}

interface Friend {
  id: string
  userId: string
  name: string
  isOnline: boolean
}

interface PrivateRoom {
  id: string
  hostId: string
  hostName: string
  guestId?: string
  guestName?: string
  status: "waiting" | "ready" | "playing"
  createdAt: any
}

export default function CustomModePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [friendIdentifier, setFriendIdentifier] = useState("")
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [sending, setSending] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [myRooms, setMyRooms] = useState<PrivateRoom[]>([])
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [activeTab, setActiveTab] = useState("friends")
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [friendSearchTerm, setFriendSearchTerm] = useState("")

  useEffect(() => {
    if (!user) return

    const sentQuery = query(collection(db, "friendRequests"), where("fromId", "==", user.uid))
    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FriendRequest[]
      setSentRequests(requests.filter((r) => r.status === "pending"))

      // Get accepted friends
      const acceptedFriends = requests.filter((r) => r.status === "accepted")
      updateFriendsWithPresence(acceptedFriends.map((f) => ({ userId: f.toId, name: f.toName })))
    })

    const receivedQuery = query(
      collection(db, "friendRequests"),
      where("toId", "==", user.uid),
      where("status", "==", "pending"),
    )
    const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FriendRequest[]
      setReceivedRequests(requests)
    })

    // Also get friends where user is the receiver
    const receivedFriendsQuery = query(
      collection(db, "friendRequests"),
      where("toId", "==", user.uid),
      where("status", "==", "accepted"),
    )
    const unsubscribeReceivedFriends = onSnapshot(receivedFriendsQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FriendRequest[]
      const receivedFriends = requests.map((f) => ({ userId: f.fromId, name: f.fromName }))
      updateFriendsWithPresence(receivedFriends)
    })

    return () => {
      unsubscribeSent()
      unsubscribeReceived()
      unsubscribeReceivedFriends()
    }
  }, [user])

  const updateFriendsWithPresence = (friendsList: { userId: string; name: string }[]) => {
    const presenceRefs = friendsList.map((friend) => {
      const presenceRef = ref(realtimeDb, `presence/${friend.userId}`)
      return { friend, presenceRef }
    })

    presenceRefs.forEach(({ friend, presenceRef }) => {
      onValue(presenceRef, (snapshot) => {
        const isOnline = snapshot.val()?.online || false
        setFriends((prev) => {
          const existing = prev.find((f) => f.userId === friend.userId)
          if (existing) {
            return prev.map((f) => (f.userId === friend.userId ? { ...f, isOnline } : f))
          } else {
            return [...prev, { id: friend.userId, userId: friend.userId, name: friend.name, isOnline }]
          }
        })
      })
    })

    return () => {
      presenceRefs.forEach(({ presenceRef }) => off(presenceRef))
    }
  }

  useEffect(() => {
    if (!user) return

    const roomsQuery = query(
      collection(db, "privateRooms"),
      where("hostId", "==", user.uid),
      where("status", "==", "waiting"),
    )
    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PrivateRoom[]
      setMyRooms(rooms)
    })

    return () => unsubscribe()
  }, [user])

  const sendFriendRequest = async () => {
    if (!user || !friendIdentifier.trim()) return

    setSending(true)
    try {
      // Search by email or username
      const usersQuery = query(collection(db, "users"), where("email", "==", friendIdentifier.trim()))
      let usersSnapshot = await getDocs(usersQuery)

      // If not found by email, try username
      if (usersSnapshot.empty) {
        const usernameQuery = query(collection(db, "users"), where("displayName", "==", friendIdentifier.trim()))
        usersSnapshot = await getDocs(usernameQuery)
      }

      if (usersSnapshot.empty) {
        alert("Хэрэглэгч олдсонгүй")
        return
      }

      const friendDoc = usersSnapshot.docs[0]
      const friendData = friendDoc.data()

      if (friendDoc.id === user.uid) {
        alert("Өөртөө хүсэлт илгээж болохгүй")
        return
      }

      const existingQuery = query(
        collection(db, "friendRequests"),
        where("fromId", "==", user.uid),
        where("toId", "==", friendDoc.id),
      )
      const existingSnapshot = await getDocs(existingQuery)

      if (!existingSnapshot.empty) {
        alert("Хүсэлт аль хэдийн илгээсэн байна")
        return
      }

      await addDoc(collection(db, "friendRequests"), {
        fromId: user.uid,
        fromName: user.displayName || user.email || "Anonymous",
        toId: friendDoc.id,
        toName: friendData.displayName || friendData.email || "Anonymous",
        status: "pending",
        createdAt: serverTimestamp(),
      })

      setFriendIdentifier("")
      alert("Хүсэлт амжилттай илгээгдлээ!")
    } catch (error) {
      console.error("Error sending friend request:", error)
      alert("Хүсэлт илгээхэд алдаа гарлаа")
    } finally {
      setSending(false)
    }
  }

  const acceptRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "accepted",
      })
    } catch (error) {
      console.error("Error accepting request:", error)
    }
  }

  const rejectRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "rejected",
      })
    } catch (error) {
      console.error("Error rejecting request:", error)
    }
  }

  const createPrivateRoom = async () => {
    if (!user) return

    setCreatingRoom(true)
    try {
      const roomRef = await addDoc(collection(db, "privateRooms"), {
        hostId: user.uid,
        hostName: user.displayName || user.email || "Anonymous",
        status: "waiting",
        createdAt: serverTimestamp(),
      })

      const roomLink = `${window.location.origin}/play/custom/room/${roomRef.id}`
      await navigator.clipboard.writeText(roomLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
      alert("Өрөө үүсгэгдлээ! Холбоос хуулагдсан.")
    } catch (error) {
      console.error("Error creating room:", error)
      alert("Өрөө үүсгэхэд алдаа гарлаа")
    } finally {
      setCreatingRoom(false)
    }
  }

  const deleteRoom = async (roomId: string) => {
    try {
      await deleteDoc(doc(db, "privateRooms", roomId))
    } catch (error) {
      console.error("Error deleting room:", error)
    }
  }

  const playWithFriend = async (friendId: string, friendName: string) => {
    if (!user) return

    try {
      const roomRef = await addDoc(collection(db, "privateRooms"), {
        hostId: user.uid,
        hostName: user.displayName || user.email || "Anonymous",
        guestId: friendId,
        guestName: friendName,
        status: "ready",
        createdAt: serverTimestamp(),
      })

      router.push(`/play/custom/room/${roomRef.id}`)
    } catch (error) {
      console.error("Error creating game:", error)
      alert("Тоглоом үүсгэхэд алдаа гарлаа")
    }
  }

  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const results = await searchUsers(searchTerm)
      // Filter out current user and existing friends
      const filtered = results.filter((u) => u.userId !== user?.uid && !friends.some((f) => f.userId === u.userId))
      setSearchResults(filtered)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleDeleteFriend = async (friendId: string) => {
    if (!user) return

    if (!confirm("Энэ найзыг устгах уу?")) return

    try {
      await deleteFriend(user.uid, friendId)
      setFriends((prev) => prev.filter((f) => f.userId !== friendId))
    } catch (error) {
      console.error("Error deleting friend:", error)
      alert("Найз устгахад алдаа гарлаа")
    }
  }

  const sendPlayInvite = async (friendId: string, friendName: string) => {
    if (!user) return

    try {
      await addDoc(collection(db, "playInvites"), {
        fromId: user.uid,
        fromName: user.displayName || user.email || "Anonymous",
        toId: friendId,
        toName: friendName,
        status: "pending",
        createdAt: serverTimestamp(),
      })
      alert("Тоглох хүсэлт илгээгдлээ!")
    } catch (error) {
      console.error("Error sending play invite:", error)
      alert("Хүсэлт илгээхэд алдаа гарлаа")
    }
  }

  const sendFriendRequestToUser = async (userId: string, userName: string) => {
    if (!user) return

    try {
      const existingQuery = query(
        collection(db, "friendRequests"),
        where("fromId", "==", user.uid),
        where("toId", "==", userId),
      )
      const existingSnapshot = await getDocs(existingQuery)

      if (!existingSnapshot.empty) {
        alert("Хүсэлт аль хэдийн илгээсэн байна")
        return
      }

      await addDoc(collection(db, "friendRequests"), {
        fromId: user.uid,
        fromName: user.displayName || user.email || "Anonymous",
        toId: userId,
        toName: userName,
        status: "pending",
        createdAt: serverTimestamp(),
      })

      alert("Найзын хүсэлт илгээгдлээ!")
      setSearchResults([])
      setSearchTerm("")
    } catch (error) {
      console.error("Error sending friend request:", error)
      alert("Хүсэлт илгээхэд алдаа гарлаа")
    }
  }

  const createRoomAndInviteFriends = async () => {
    if (!user || friends.length === 0) {
      alert("Найз байхгүй байна")
      return
    }

    setCreatingRoom(true)
    try {
      const roomRef = await addDoc(collection(db, "privateRooms"), {
        hostId: user.uid,
        hostName: user.displayName || user.email || "Anonymous",
        status: "waiting",
        createdAt: serverTimestamp(),
      })

      // Send invites to all online friends
      const invitePromises = friends
        .filter((f) => f.isOnline)
        .map((friend) =>
          addDoc(collection(db, "roomInvites"), {
            roomId: roomRef.id,
            fromId: user.uid,
            fromName: user.displayName || user.email || "Anonymous",
            toId: friend.userId,
            toName: friend.name,
            status: "pending",
            createdAt: serverTimestamp(),
          }),
        )

      await Promise.all(invitePromises)

      const roomLink = `${window.location.origin}/play/custom/room/${roomRef.id}`
      await navigator.clipboard.writeText(roomLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
      alert(`Өрөө үүсгэгдэж, ${invitePromises.length} най zad хүсэлт илгээгдлээ!`)
    } catch (error) {
      console.error("Error creating room:", error)
      alert("Өрөө үүсгэхэд алдаа гарлаа")
    } finally {
      setCreatingRoom(false)
    }
  }

  const filteredFriends = friends.filter((f) => f.name.toLowerCase().includes(friendSearchTerm.toLowerCase()))

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="text-center mt-8 lg:-translate-x-150 lg:-translate-y-14 sm:-translate-x-80 -translate-x-30 -translate-y-8 sm:-translate-y-10">
            <Button
              onClick={() => router.push("/play")}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800 bg-black"
            >
              ← Буцах
            </Button>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Найзуудтайгаа тоглох
          </h1>
          <p className="text-zinc-400 text-lg">Найзуудруугаа хүсэлт илгээж, хамт өрсөлдөөрөй</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 mb-6">
            <TabsTrigger value="friends" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 mr-2" />
              Найзууд
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-pink-600">
              <Mail className="w-4 h-4 mr-2 translate-x-3" />
              Хүсэлт
            </TabsTrigger>
            <TabsTrigger value="rooms" className="data-[state=active]:bg-orange-600">
              <LinkIcon className="w-4 h-4 mr-2 translate-x-3" />
              Өрөө
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-purple-400" />
                <Input
                  placeholder="Найз хайх..."
                  value={friendSearchTerm}
                  onChange={(e) => setFriendSearchTerm(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>

              {filteredFriends.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 hover:border-purple-600 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <button
                          onClick={() => {
                            setSelectedUserId(friend.userId)
                            setShowProfileModal(true)
                          }}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold hover:scale-110 transition-transform cursor-pointer"
                        >
                          {friend.name.charAt(0).toUpperCase()}
                        </button>
                        <div className="flex-1">
                          <div className="font-bold">{friend.name}</div>
                          <div
                            className={`text-xs flex items-center gap-1 ${friend.isOnline ? "text-green-400" : "text-zinc-500"}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${friend.isOnline ? "bg-green-400 animate-pulse" : "bg-zinc-500"}`}
                            />
                            {friend.isOnline ? "Онлайн" : "Оффлайн"}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => sendPlayInvite(friend.userId, friend.name)}
                          disabled={!friend.isOnline}
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50"
                        >
                          <Gamepad2 className="w-4 h-4 mr-1" />
                          Тоглох
                        </Button>
                        <Button
                          onClick={() => handleDeleteFriend(friend.userId)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <Users className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                  <p>Найз олдсонгүй</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            {/* Incoming Requests */}
            {receivedRequests.length > 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-green-400" />
                  Ирсэн хүсэлтүүд
                  <span className="text-sm bg-green-600 px-2 py-1 rounded-full">{receivedRequests.length}</span>
                </h3>
                <div className="space-y-3">
                  {receivedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between bg-zinc-800/50 p-4 rounded-lg border border-zinc-700"
                    >
                      <div>
                        <div className="font-bold">{request.fromName}</div>
                        <div className="text-sm text-zinc-400">Тантай найз болохыг хүсч байна</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => acceptRequest(request.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Зөвшөөрөх
                        </Button>
                        <Button
                          onClick={() => rejectRequest(request.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Татгалзах
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Search Users */}
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <h3 className="text-zinc-800 text-xl font-bold mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-pink-400" />
                Хүн хайх
              </h3>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Хэрэглэгчийн нэр хайх..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearchUsers()}
                  className="bg-zinc-800/50 border-zinc-700"
                />
                <Button onClick={handleSearchUsers} disabled={searching} className="bg-pink-600 hover:bg-pink-500">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-lg border border-zinc-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center font-bold">
                          {user.userName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-bold">{user.userName}</div>
                          <div className="text-xs text-zinc-400">Level {Math.floor(user.totalXP / 1000) + 1}</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => sendFriendRequestToUser(user.userId, user.userName)}
                        size="sm"
                        className="bg-pink-600 hover:bg-pink-500"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Хүсэлт илгээх
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <h3 className="text-zinc-800 text-xl font-bold mb-4">Өрөө үүсгэх</h3>
              <p className="text-zinc-400 text-sm mb-1 -translate-y-8">
                Өрөө үүсгээд бүх онлайн найзуудруугаа хүсэлт илгээнэ. Холбоосоор шууд нэгдэх боломжтой.
              </p>
              <Button
                onClick={createRoomAndInviteFriends}
                disabled={creatingRoom || friends.filter((f) => f.isOnline).length === 0}
                className="-translate-x-3 w-80 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                {creatingRoom ? "Үүсгэж байна..." : "Өрөө үүсгэж найзуудад хүсэлт илгээх"}
              </Button>
              {friends.filter((f) => f.isOnline).length === 0 && (
                <p className="text-sm text-yellow-400 mt-2">Онлайн найз байхгүй байна</p>
              )}
            </Card>

            {myRooms.length > 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                <h3 className="text-xl font-bold mb-4">Миний өрөөнүүд</h3>
                <div className="space-y-3">
                  {myRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between bg-zinc-800/50 p-4 rounded-lg border border-zinc-700"
                    >
                      <div>
                        <div className="font-bold">Өрөө #{room.id.slice(0, 8)}</div>
                        <div className="text-sm text-zinc-400">Хүлээж байна...</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/play/custom/room/${room.id}`)
                            setCopiedLink(true)
                            setTimeout(() => setCopiedLink(false), 2000)
                          }}
                          size="sm"
                          variant="outline"
                          className="border-zinc-700"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => router.push(`/play/custom/room/${room.id}?spectate=true`)}
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteRoom(room.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <UserProfileModal
        userId={selectedUserId || ""}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false)
          setSelectedUserId(null)
        }}
      />
    </div>
  )
}
