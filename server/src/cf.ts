// server/src/cf.ts
import axios from 'axios'
import { CFProblem } from './types.js'

const CF_API = 'https://codeforces.com/api'
const SKEW_MS = 30_000  // accept AC up to 30s before start to dodge skew

export async function fetchProblems(min: number, max: number): Promise<CFProblem[]> {
  const { data } = await axios.get(`${CF_API}/problemset.problems`)
  if (data.status !== 'OK') throw new Error('CF problemset API failed')
  const problems: CFProblem[] = data.result.problems
    .filter((p: any) => typeof p.rating === 'number' && p.rating >= min && p.rating <= max)
    .filter((p: any) => !String(p.name).toLowerCase().includes('kotlin'))
    .map((p: any) => ({ contestId: p.contestId, index: p.index, name: p.name, rating: p.rating }))
  return problems
}

export function sampleDistinct<T>(arr: T[], k: number): T[] {
  const n = arr.length
  if (k >= n) return [...arr]
  const used = new Set<number>()
  const out: T[] = []
  while (out.length < k) {
    const i = Math.floor(Math.random() * n)
    if (used.has(i)) continue
    used.add(i)
    out.push(arr[i])
  }
  return out
}

export type SolveHit = { when: number }

/** Fetch up to 1000 recent subs and return earliest OK after (start - skew). */
export async function firstSolveAfter(handle: string, contestId: number, idx: string, afterEpoch: number): Promise<SolveHit | null> {
  const url = `${CF_API}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=1000`
  const { data } = await axios.get(url, { headers: { 'User-Agent': 'lockout-1v1' } })
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
