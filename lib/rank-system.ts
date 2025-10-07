export interface Rank {
  id: number
  name: string
  description: string
  minScore: number
  maxScore: number
  color: string
  icon: string
}

export const RANKS: Rank[] = [
  {
    id: 1,
    name: "Novice Blocker",
    description: "Та тоглолтонд анхны алхмаа хийлээ. Одоо блок бүрийг зөв байрлуулж сурах цаг ирлээ!",
    minScore: 0,
    maxScore: 999,
    color: "#9CA3AF",
    icon: "/rankavatarimage/beginner-novice-tetris-player-avatar-gray.jpg",
  },
  {
    id: 2,
    name: "Quick Learner",
    description: "Хурдан суралцагч! Алдаа бүрээс туршлага авч, хурдан хөгжиж байна.",
    minScore: 1000,
    maxScore: 2999,
    color: "#10B981",
    icon: "/rankavatarimage/student-learner-tetris-avatar-green.jpg",
  },
  {
    id: 3,
    name: "Tile Rookie",
    description: "Эхний ялалтуудаа авч чадлаа. Илүү хурдан, нарийн байрлуулж туршлага хуримтлуул!",
    minScore: 3000,
    maxScore: 5999,
    color: "#3B82F6",
    icon: "/rankavatarimage/rookie-gamer-tetris-avatar-blue.jpg",
  },
  {
    id: 4,
    name: "Combo Trainee",
    description: "Combo үүсгэж чадлаа. Одоо тэдгээрийг урт гинжин холбоо болгоорой.",
    minScore: 6000,
    maxScore: 9999,
    color: "#8B5CF6",
    icon: "/rankavatarimage/trainee-combo-tetris-avatar-purple.jpg",
  },
  {
    id: 5,
    name: "Speed Shifter",
    description: "Хурдны мэдрэмжээ олсон байна. Блокоо хурдан байрлуулж, тоглолтонд давамгайла!",
    minScore: 10000,
    maxScore: 14999,
    color: "#06B6D4",
    icon: "/rankavatarimage/speed-fast-racer-tetris-avatar-cyan.jpg",
  },
  {
    id: 6,
    name: "Smart Stacker",
    description: "Оюун ухаантай тоглогч! Таны блокийн хураалт нарийн, уран сайхан болжээ.",
    minScore: 15000,
    maxScore: 21999,
    color: "#14B8A6",
    icon: "/rankavatarimage/smart-intelligent-brain-tetris-avatar-teal.jpg",
  },
  {
    id: 7,
    name: "Line Breaker",
    description: "Нэг дор хэд хэдэн мөрийг арилгаж чаддаг боллоо. Та хүчирхэг болж байна!",
    minScore: 22000,
    maxScore: 29999,
    color: "#F59E0B",
    icon: "/rankavatarimage/breaker-powerful-tetris-avatar-orange.jpg",
  },
  {
    id: 8,
    name: "Block Specialist",
    description: "Мэргэжлийн түвшинд хүрч байна. Хурд, хяналт хоёрын төгс тэнцвэрийг оллоо.",
    minScore: 30000,
    maxScore: 39999,
    color: "#EF4444",
    icon: "/rankavatarimage/specialist-expert-tetris-avatar-red.jpg",
  },
  {
    id: 9,
    name: "Tetris Warrior",
    description: "Тулаанд бэлэн болсон байна. Хэнд ч бүү бууж өг!",
    minScore: 40000,
    maxScore: 54999,
    color: "#DC2626",
    icon: "/rankavatarimage/warrior-fighter-tetris-avatar-dark-red.jpg",
  },
  {
    id: 10,
    name: "Combo Slayer",
    description: "Таны combo хүчирхэг болжээ. Бусдыг дарахад туршлага чинь хязгааргүй урсана!",
    minScore: 55000,
    maxScore: 74999,
    color: "#EC4899",
    icon: "/rankavatarimage/slayer-fire-powerful-tetris-avatar-pink.jpg",
  },
  {
    id: 11,
    name: "Speed Master",
    description: "Хурдны хязгаарыг давлаа. Одоо секунд бүрт ялалт шидээр дүүрэн байна!",
    minScore: 75000,
    maxScore: 99999,
    color: "#A855F7",
    icon: "/rankavatarimage/speed-master-lightning-tetris-avatar-purple.jpg",
  },
  {
    id: 12,
    name: "IQ Strategist",
    description: "Ухаалаг стратегич! Тоглолт бүр төлөвлөгөөтэй, ялалт бүр тооцоотой.",
    minScore: 100000,
    maxScore: 129999,
    color: "#6366F1",
    icon: "/rankavatarimage/strategist-genius-iq-tetris-avatar-indigo.jpg",
  },
  {
    id: 13,
    name: "Elite Tiler",
    description: "Элит ангилалд орлоо! Хүмүүс таны тоглолтыг даган дуурайж байна.",
    minScore: 130000,
    maxScore: 169999,
    color: "#8B5CF6",
    icon: "/rankavatarimage/elite-crown-royal-tetris-avatar-purple.jpg",
  },
  {
    id: 14,
    name: "Plasma Ranker",
    description: "Хурд, combo, IQ-г төгс нэгтгэж чадсан. Плазмын эрчим мэт хүчирхэг!",
    minScore: 170000,
    maxScore: 219999,
    color: "#D946EF",
    icon: "/rankavatarimage/plasma-energy-electric-tetris-avatar-magenta.jpg",
  },
  {
    id: 15,
    name: "Void Commander",
    description: "Тоглоомын орон зайг захирч байна. Хэн ч таны ур чадварыг давахгүй!",
    minScore: 220000,
    maxScore: 279999,
    color: "#7C3AED",
    icon: "/rankavatarimage/void-space-commander-tetris-avatar-dark-purple.jpg",
  },
  {
    id: 16,
    name: "Zen Grandmaster",
    description: "Дотоод тэнцвэрээ оллоо. Тоглоом таны оюун ухааны нэг хэсэг боллоо.",
    minScore: 280000,
    maxScore: 349999,
    color: "#06B6D4",
    icon: "/rankavatarimage/zen-meditation-grandmaster-tetris-avatar-cyan.jpg",
  },
  {
    id: 17,
    name: "Matrix Hero",
    description: "Matrix-ийн хуулийг өөрчилж чадлаа! Өөрийн ертөнцтэй тоглогч боллоо.",
    minScore: 350000,
    maxScore: 449999,
    color: "#10B981",
    icon: "/rankavatarimage/matrix-digital-hero-tetris-avatar-green.jpg",
  },
  {
    id: 18,
    name: "Tetrion Legend",
    description: "Домогт тоглогчдын эгнээнд нэгдлээ. Таны нэр leaderboard-д мөнхөрлөө!",
    minScore: 450000,
    maxScore: 599999,
    color: "#F59E0B",
    icon: "/rankavatarimage/legendary-mythic-tetris-avatar-gold.jpg",
  },
  {
    id: 19,
    name: "Block Emperor",
    description: "Та хаан боллоо! Хэн ч таныг дийлэхгүй. Дээд түвшин хүлээж байна!",
    minScore: 600000,
    maxScore: 799999,
    color: "#EAB308",
    icon: "/rankavatarimage/emperor-king-crown-tetris-avatar-golden.jpg",
  },
  {
    id: 20,
    name: "Infinite Coder",
    description: "Дээд түвшинд хүрлээ. Score хязгааргүй өснө, таны домог үргэлжилсээр...",
    minScore: 800000,
    maxScore: 999999999,
    color: "#471149ff",
    icon: "/rankavatarimage/cosmic-infinite-universe-tetris-avatar-white.jpg",
  },
]

export function getRankByScore(score: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].minScore) {
      return RANKS[i]
    }
  }
  return RANKS[0]
}

export function getNextRankByScore(currentScore: number): Rank | null {
  const currentRank = getRankByScore(currentScore)
  const nextRankIndex = RANKS.findIndex((r) => r.id === currentRank.id) + 1
  return nextRankIndex < RANKS.length ? RANKS[nextRankIndex] : null
}

export function getScoreProgress(currentScore: number): { current: number; next: number; percentage: number } {
  const currentRank = getRankByScore(currentScore)
  const nextRank = getNextRankByScore(currentScore)

  if (!nextRank) {
    return { current: currentScore, next: currentScore, percentage: 100 }
  }

  const scoreInCurrentRank = currentScore - currentRank.minScore
  const scoreNeededForNext = nextRank.minScore - currentRank.minScore
  const percentage = (scoreInCurrentRank / scoreNeededForNext) * 100

  return {
    current: scoreInCurrentRank,
    next: scoreNeededForNext,
    percentage: Math.min(percentage, 100),
  }
}

export function getLevelFromXP(xp: number): number {
  // Every 1000 XP = 1 level
  return Math.floor(xp / 1000) + 1
}

export function getXPProgress(currentXP: number): { current: number; next: number; percentage: number; level: number } {
  const level = getLevelFromXP(currentXP)
  const xpForCurrentLevel = (level - 1) * 1000
  const xpInCurrentLevel = currentXP - xpForCurrentLevel
  const xpNeededForNext = 1000
  const percentage = (xpInCurrentLevel / xpNeededForNext) * 100

  return {
    current: xpInCurrentLevel,
    next: xpNeededForNext,
    percentage: Math.min(percentage, 100),
    level,
  }
}

export function getRankFromXP(xp: number): Rank {
  // For backward compatibility, treat XP as score
  return getRankByScore(xp)
}

export function calculateXPFromScore(score: number, lines: number, level: number): number {
  let xp = Math.floor(score / 10)
  xp += lines * 5
  xp += level * 10
  return xp
}

export const getRankFromScoreAlias = getRankByScore

// Battle Rank System (based on battle points, not score)
export interface BattleRank {
  id: number
  name: string
  description: string
  minPoints: number
  maxPoints: number
  color: string
  icon: string
}

export const BATTLE_RANKS: BattleRank[] = [
  {
    id: 1,
    name: "Bronze Beginner",
    description: "Тулааны анхны алхам. Туршлага хуримтлуулж эхэл!",
    minPoints: 0,
    maxPoints: 799,
    color: "#CD7F32",
    icon: "/battlerankavrk/bronze-beginner.jpg",
  },
  {
    id: 2,
    name: "Bronze Fighter",
    description: "Bronze ангилалд тогтвортой байна. Цааш урагш!",
    minPoints: 800,
    maxPoints: 1199,
    color: "#CD7F32",
    icon: "/battlerankavrk/bronze-fighter.jpg",
  },
  {
    id: 3,
    name: "Silver Warrior",
    description: "Silver ангилалд хүрлээ. Илүү хүчтэй өрсөлдөгчид хүлээж байна!",
    minPoints: 1200,
    maxPoints: 1599,
    color: "#C0C0C0",
    icon: "/battlerankavrk/silver-warrior.jpg",
  },
  {
    id: 4,
    name: "Silver Champion",
    description: "Silver-ийн дээд түвшин. Gold руу замаа нээж байна!",
    minPoints: 1600,
    maxPoints: 1999,
    color: "#C0C0C0",
    icon: "/battlerankavrk/silver-champion.jpg",
  },
  {
    id: 5,
    name: "Gold Contender",
    description: "Gold ангилалд орлоо! Мэргэжлийн түвшинд ойртож байна.",
    minPoints: 2000,
    maxPoints: 2399,
    color: "#FFD700",
    icon: "/battlerankavrk/gold-contender.jpg",
  },
  {
    id: 6,
    name: "Gold Master",
    description: "Gold-ийн мастер! Platinum хүлээж байна.",
    minPoints: 2400,
    maxPoints: 2799,
    color: "#FFD700",
    icon: "/battlerankavrk/gold-master.jpg",
  },
  {
    id: 7,
    name: "Platinum Elite",
    description: "Элит ангилалд орлоо. Дэлхийн шилдэг тоглогчдын эгнээнд!",
    minPoints: 2800,
    maxPoints: 3199,
    color: "#E5E4E2",
    icon: "/battlerankavrk/platinum-elite.jpg",
  },
  {
    id: 8,
    name: "Platinum Legend",
    description: "Platinum домог! Diamond хүлээж байна.",
    minPoints: 3200,
    maxPoints: 3599,
    color: "#E5E4E2",
    icon: "/battlerankavrk/platinum-legend.jpg",
  },
  {
    id: 9,
    name: "Diamond Prodigy",
    description: "Diamond ангилал! Дэлхийн 1% тоглогчдын эгнээнд!",
    minPoints: 3600,
    maxPoints: 3999,
    color: "#B9F2FF",
    icon: "/battlerankavrk/diamond-prodigy.jpg",
  },
  {
    id: 10,
    name: "Diamond Immortal",
    description: "Diamond-ийн дээд түвшин. Хэн ч таныг дийлэхгүй!",
    minPoints: 4000,
    maxPoints: 999999,
    color: "#B9F2FF",
    icon: "/battlerankavrk/diamond-immortal.jpg",
  },
]

export function getRankByBattlePoints(points: number): BattleRank {
  for (let i = BATTLE_RANKS.length - 1; i >= 0; i--) {
    if (points >= BATTLE_RANKS[i].minPoints) {
      return BATTLE_RANKS[i]
    }
  }
  return BATTLE_RANKS[0]
}

export function getNextBattleRank(currentPoints: number): BattleRank | null {
  const currentRank = getRankByBattlePoints(currentPoints)
  const nextRankIndex = BATTLE_RANKS.findIndex((r) => r.id === currentRank.id) + 1
  return nextRankIndex < BATTLE_RANKS.length ? BATTLE_RANKS[nextRankIndex] : null
}

export function getBattlePointsProgress(currentPoints: number): { current: number; next: number; percentage: number } {
  const currentRank = getRankByBattlePoints(currentPoints)
  const nextRank = getNextBattleRank(currentPoints)

  if (!nextRank) {
    return { current: currentPoints, next: currentPoints, percentage: 100 }
  }

  const pointsInCurrentRank = currentPoints - currentRank.minPoints
  const pointsNeededForNext = nextRank.minPoints - currentRank.minPoints
  const percentage = (pointsInCurrentRank / pointsNeededForNext) * 100

  return {
    current: pointsInCurrentRank,
    next: pointsNeededForNext,
    percentage: Math.min(percentage, 100),
  }
}

export const getRankFromScore = getRankByScore
