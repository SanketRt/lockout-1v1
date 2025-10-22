import axios from 'axios'
import { CFProblem } from './types.js'

const CF_API = 'https://codeforces.com/api'
const SKEW_MS = 30_000

// simple in-memory cache for 10 minutes
let cached: { at: number, items: CFProblem[] } | null = null
const CACHE_TTL = 10 * 60 * 1000

export async function fetchProblems(min: number, max: number): Promise<CFProblem[]> {
  const now = Date.now()
  if (!cached || now - cached.at > CACHE_TTL) {
    const { data } = await axios.get(`${CF_API}/problemset.problems`, {
      timeout: 15_000,
      headers: { 'User-Agent': 'lockout-1v1' },
      maxContentLength: 50 * 1024 * 1024,
    })
    if (data.status !== 'OK') throw new Error('CF problemset API failed')
    const all: CFProblem[] = data.result.problems
      .filter((p: any) => typeof p.rating === 'number')
      .filter((p: any) => !String(p.name).toLowerCase().includes('kotlin'))
      .map((p: any) => ({ contestId: p.contestId, index: p.index, name: p.name, rating: p.rating }))
    cached = { at: now, items: all }
  }
  return cached.items.filter(p => (p.rating ?? 0) >= min && (p.rating ?? 0) <= max)
}

export function sampleDistinct<T>(arr: T[], k: number): T[] {
  const n = arr.length
  if (k >= n) return arr.slice(0, k)
  const used = new Set<number>(), out: T[] = []
  while (out.length < k) { const i = Math.floor(Math.random() * n); if (!used.has(i)) { used.add(i); out.push(arr[i]) } }
  return out
}

export type SolveHit = { when: number }

export async function firstSolveAfter(handle: string, contestId: number, idx: string, afterEpoch: number): Promise<SolveHit | null> {
  const url = `${CF_API}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=1000`
  const { data } = await axios.get(url, { timeout: 12_000, headers: { 'User-Agent': 'lockout-1v1' } })
  if (data.status !== 'OK') throw new Error('CF user.status failed')
  const floorMs = afterEpoch - SKEW_MS
  let best: number | null = null
  for (const s of data.result as any[]) {
    if (!s || s.verdict !== 'OK') continue
    const p = s.problem
    if (!p || p.contestId !== contestId || p.index !== idx) continue
    const t = Number(s.creationTimeSeconds) * 1000
    if (t >= floorMs && (best === null || t < best)) best = t
  }
  return best ? { when: best } : null
}
