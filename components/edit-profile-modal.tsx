"use client"

import type React from "react"

import { useState } from "react"
import type { User } from "firebase/auth"
import { updateProfile, updatePassword } from "firebase/auth"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { updateUserProfileData, type UserProfile } from "@/lib/game-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  profile: UserProfile | null
  onProfileUpdate: (profile: UserProfile) => void
}

export function EditProfileModal({ isOpen, onClose, user, profile, onProfileUpdate }: EditProfileModalProps) {
  const [userName, setUserName] = useState(user.displayName || "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      let photoURL = profile?.profilePictureURL || user.photoURL

      // Upload profile image if selected
      if (profileImage) {
        const storageRef = ref(storage, `profile-pictures/${user.uid}`)
        await uploadBytes(storageRef, profileImage)
        photoURL = await getDownloadURL(storageRef)
      }

      // Update Firebase Auth profile
      if (userName !== user.displayName || photoURL !== user.photoURL) {
        await updateProfile(user, {
          displayName: userName,
          photoURL: photoURL || undefined,
        })
      }

      // Update Firestore profile
      await updateUserProfileData(user.uid, {
        userName,
        profilePictureURL: photoURL || undefined,
      })

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError("Нууц үг таарахгүй байна")
          setLoading(false)
          return
        }
        if (newPassword.length < 6) {
          setError("Нууц үг 6-аас дээш тэмдэгт байх ёстой")
          setLoading(false)
          return
        }
        await updatePassword(user, newPassword)
      }

      // Update local profile state
      if (profile) {
        onProfileUpdate({
          ...profile,
          userName,
          profilePictureURL: photoURL || undefined,
        })
      }

      setSuccess("Мэдээлэл амжилттай шинэчлэгдлээ")
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-primary/30 rounded-lg shadow-2xl shadow-primary/20 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-primary/20 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Мэдээлэл засах</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-4 border-primary">
              <AvatarImage src={previewUrl || profile?.profilePictureURL || user.photoURL || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
                {(userName || user.email || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label
                htmlFor="profile-image"
                className="cursor-pointer px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors inline-block"
              >
                Зураг солих
              </Label>
              <Input id="profile-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Хэрэглэгчийн нэр
            </Label>
            <Input
              id="username"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-muted/10 border-primary/20 focus:border-primary"
              required
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">
              Шинэ нууц үг (хоосон орхивол өөрчлөгдөхгүй)
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-muted/10 border-primary/20 focus:border-primary"
              placeholder="••••••"
            />
          </div>

          {/* Confirm Password */}
          {newPassword && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Нууц үг баталгаажуулах
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-muted/10 border-primary/20 focus:border-primary"
                placeholder="••••••"
              />
            </div>
          )}

          {/* Error/Success Messages */}
          {error && <div className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>}
          {success && <div className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">{success}</div>}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-primary/20 hover:bg-primary/10 bg-transparent"
              disabled={loading}
            >
              Болих
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loading}
            >
              {loading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
