import { SpeedInsights } from "@vercel/speed-insights/next"
import type { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "https://sb-io.vercel.app/"

  const result = await SpeedInsights.run({
    url,
    strategy: "mobile", // эсвэл "desktop"
  })

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  })
}
