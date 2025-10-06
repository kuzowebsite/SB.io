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
    description: "Сайн байна! Та анхны алхмаа хийлээ. Одоо блок бүрийг илүү ухаалгаар байрлуулж сурцгаая!",
    minScore: 0,
    maxScore: 999,
    color: "#9CA3AF",
    icon: "🔰",
  },
  {
    id: 2,
    name: "Quick Learner",
    description: "Та хурдан суралцагч байна! Алдаа бүрээс туршлага ав, та улам хүчтэй болж байна.",
    minScore: 1000,
    maxScore: 2999,
    color: "#10B981",
    icon: "📚",
  },
  {
    id: 3,
    name: "Tile Rookie",
    description: "Амжилттай! Та эхний ялалтуудаа авч чадлаа. Илүү хурдтай, илүү нарийн хурааж үз!",
    minScore: 3000,
    maxScore: 5999,
    color: "#3B82F6",
    icon: "🎯",
  },
  {
    id: 4,
    name: "Combo Trainee",
    description: "Гайхалтай! Та combo үүсгэж чаддаг боллоо. Одоо тэдгээрийг урт гинжин холбоо болгоорой.",
    minScore: 6000,
    maxScore: 9999,
    color: "#8B5CF6",
    icon: "⚡",
  },
  {
    id: 5,
    name: "Speed Shifter",
    description: "Та хурдны мэдрэмжийг эзэмшиж байна. Хурдан бод, хурдан хөдөл — чи жинхэнэ тоглогч болж байна!",
    minScore: 10000,
    maxScore: 14999,
    color: "#06B6D4",
    icon: "🚀",
  },
  {
    id: 6,
    name: "Smart Stacker",
    description: "Оюун ухаантай тоглогч! Таны хураалт уран нарийн болжээ. Төгс symmetry хийхийг оролд!",
    minScore: 15000,
    maxScore: 21999,
    color: "#14B8A6",
    icon: "🧠",
  },
  {
    id: 7,
    name: "Line Breaker",
    description: "Та нэг биш, хэд хэдэн мөрийг нэг дор арилгаж чаддаг боллоо. Энэ бол хүчний эхлэл!",
    minScore: 22000,
    maxScore: 29999,
    color: "#F59E0B",
    icon: "💥",
  },
  {
    id: 8,
    name: "Block Specialist",
    description: "Мэргэжлийн түвшинд хүрч байна. Хурд, хяналт хоёрын төгс тэнцвэрийг олж чаджээ!",
    minScore: 30000,
    maxScore: 39999,
    color: "#EF4444",
    icon: "🎓",
  },
  {
    id: 9,
    name: "Tetris Warrior",
    description: "Та одоо тулаанд оролцох бэлэн болсон. Хэнд ч бүү бууж өг!",
    minScore: 40000,
    maxScore: 54999,
    color: "#DC2626",
    icon: "⚔️",
  },
  {
    id: 10,
    name: "Combo Slayer",
    description: "Хөөх! Таны combo аймшигтай хүчтэй болжээ. Бусдыг дарахад XP чинь хязгааргүй урсана!",
    minScore: 55000,
    maxScore: 74999,
    color: "#EC4899",
    icon: "🔥",
  },
  {
    id: 11,
    name: "Speed Master",
    description: "Та хурдны хязгаарыг давлаа. Одоо секунд бүрт ялалт шидээр дүүрэн байна!",
    minScore: 75000,
    maxScore: 99999,
    color: "#A855F7",
    icon: "⚡",
  },
  {
    id: 12,
    name: "IQ Strategist",
    description: "Та одоо ухаалаг стратегич! Тоглолт бүрт төлөвлөгөөтэй, ялалт бүр чинь тооцоотой болжээ.",
    minScore: 100000,
    maxScore: 129999,
    color: "#6366F1",
    icon: "🎯",
  },
  {
    id: 13,
    name: "Elite Tiler",
    description: "Та одоо элит ангилалд орлоо! Хүмүүс таны тоглолтыг даган дуурайж байна.",
    minScore: 130000,
    maxScore: 169999,
    color: "#8B5CF6",
    icon: "👑",
  },
  {
    id: 14,
    name: "Plasma Ranker",
    description: "Та хурд, combo, IQ-г төгс нэгтгэж чадсан. Та бол плазмын эрчим мэт!",
    minScore: 170000,
    maxScore: 219999,
    color: "#D946EF",
    icon: "⚡",
  },
  {
    id: 15,
    name: "Void Commander",
    description: "Та тоглоомын орон зайг захирч байна. Хэн ч таны ур чадварыг давахгүй!",
    minScore: 220000,
    maxScore: 279999,
    color: "#7C3AED",
    icon: "🌌",
  },
  {
    id: 16,
    name: "Zen Grandmaster",
    description: "Та дотоод тэнцвэрээ олжээ. Тоглоом таны оюун ухааны нэг хэсэг болсон байна.",
    minScore: 280000,
    maxScore: 349999,
    color: "#06B6D4",
    icon: "🧘",
  },
  {
    id: 17,
    name: "Matrix Hero",
    description: "Matrix-ийн хуулийг өөрчилж чадлаа! Та өөрийн хэмнэл, өөрийн ертөнцтэй тоглогч!",
    minScore: 350000,
    maxScore: 449999,
    color: "#10B981",
    icon: "🦸",
  },
  {
    id: 18,
    name: "Tetrion Legend",
    description: "Та одоо домогт тоглогчдын эгнээнд нэгдлээ. Таны нэр leaderboard-д мөнхөрлөө!",
    minScore: 450000,
    maxScore: 599999,
    color: "#F59E0B",
    icon: "🏆",
  },
  {
    id: 19,
    name: "Block Emperor",
    description: "Та хаан боллоо! Хэн ч таныг дийлэхгүй. Гэхдээ бүү зогс, дээд түвшин хүлээж байна!",
    minScore: 600000,
    maxScore: 799999,
    color: "#EAB308",
    icon: "👑",
  },
  {
    id: 20,
    name: "Infinite Coder",
    description: "Та дээд түвшинд хүрлээ. Score чинь хязгааргүй өснө, гэхдээ таны домог үргэлжилсээр... ♾️",
    minScore: 800000,
    maxScore: 999999999,
    color: "#FFFFFF",
    icon: "♾️",
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
