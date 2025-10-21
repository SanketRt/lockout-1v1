import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import http from 'http'
import cors from 'cors'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

type RoomState = 'PENDING' | 'RUNNING' | 'FINISHED'
type ProblemState = 'OPEN' | 'LOCKED'
type Side = 'P1' | 'P2'

import { z } from 'zod'
import { fetchProblems, sampleDistinct, firstSolveAfter } from './cf.js'

const prisma = new PrismaClient()

const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.CORS_ORIGIN || '*'}))

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || '*' } })

const PORT = Number(process.env.PORT || 5177)

// in-memory pollers per room
const pollers = new Map<string, NodeJS.Timeout>()

function roomChannel(code: string) { return `room:${code}` }

const CreateRoomSchema = z.object({
  p1Handle: z.string().min(2),
  p2Handle: z.string().min(2),
  ratingMin: z.number().int().min(800).max(3500),
  ratingMax: z.number().int().min(800).max(3500),
  problemCount: z.number().int().min(1).max(10),
  durationMinutes: z.number().int().min(5).max(360)
}).refine(v => v.ratingMin <= v.ratingMax, { message: 'ratingMin must be <= ratingMax' })

app.post('/api/rooms', async (req: Request, res: Response) => {
  const parsed = CreateRoomSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const { p1Handle, p2Handle, ratingMin, ratingMax, problemCount, durationMinutes } = parsed.data

  const all = await fetchProblems(ratingMin, ratingMax)
  if (all.length < problemCount) return res.status(400).json({ error: 'Not enough problems in range' })
  const pick = sampleDistinct(all, problemCount)

  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const room = await prisma.room.create({
    data: {
      code, p1Handle, p2Handle, ratingMin, ratingMax, problemCount, durationMinutes,
      problems: {
        create: pick.map(p => ({ contestId: p.contestId, idx: p.index, name: p.name, rating: p.rating ?? null }))
      }
    },
    include: { problems: true }
  })

  res.json({ code: room.code, room })
})

app.get('/api/rooms/:code', async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({ where: { code: req.params.code }, include: { problems: true } })
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json({ room })
})

app.post('/api/rooms/:code/start', async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({ where: { code: req.params.code }, include: { problems: true } })
  if (!room) return res.status(404).json({ error: 'Room not found' })
  if (room.state !== 'PENDING') return res.status(400).json({ error: 'Already started' })

  const startAt = new Date()
  const endAt = new Date(startAt.getTime() + room.durationMinutes * 60_000)

  const updated = await prisma.room.update({ where: { id: room.id }, data: { state: 'RUNNING', startAt, endAt }, include: { problems: true } })
  io.to(roomChannel(updated.code)).emit('room:update', { room: updated })

  startPolling({ id: updated.id, code: updated.code })
  res.json({ ok: true, room: updated })
})

app.post('/api/rooms/:code/stop', async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({ where: { code: req.params.code } })
  if (!room) return res.status(404).json({ error: 'Room not found' })
  await stopPolling(room.id)
  const updated = await prisma.room.update({ where: { id: room.id }, data: { state: 'FINISHED', endAt: new Date() }, include: { problems: true } })
  io.to(roomChannel(updated.code)).emit('room:update', { room: updated })
  res.json({ ok: true })
})

io.on('connection', (socket) => {
  socket.on('join-room', async ({ code }) => {
    socket.join(roomChannel(code))
    const room = await prisma.room.findUnique({ where: { code }, include: { problems: true } })
    if (room) socket.emit('room:update', { room })
  })
})

server.listen(PORT, async () => {
  console.log(`server on :${PORT}`)
})

async function startPolling(room: { id: string; code: string }) {
  await stopPolling(room.id)

  const tick = async () => {
    try {
      const r = await prisma.room.findUnique({
        where: { id: room.id },
        include: { problems: true }
      })
      if (!r) return

      const now = Date.now()
      if (r.endAt && now >= new Date(r.endAt).getTime()) {
        await prisma.room.update({ where: { id: r.id }, data: { state: 'FINISHED' } })
        io.to(roomChannel(r.code)).emit('room:update', {
          room: await prisma.room.findUnique({ where: { id: r.id }, include: { problems: true } })
        })
        await stopPolling(r.id)
        return
      }

      if (!r.startAt) return

      for (const prob of r.problems) {
        if (prob.solvedBy || prob.state === 'LOCKED') continue

        const hit1 = await firstSolveAfter(r.p1Handle, prob.contestId, prob.idx, new Date(r.startAt).getTime()).catch(() => null)
        const hit2 = await firstSolveAfter(r.p2Handle, prob.contestId, prob.idx, new Date(r.startAt).getTime()).catch(() => null)

        console.log(`[poll] ${r.code} ${prob.contestId}${prob.idx} p1=${hit1?.when ?? '-'} p2=${hit2?.when ?? '-'}`)

        let winner: 'P1' | 'P2' | null = null
        let when: number | null = null
        if (hit1 && hit2) { if (hit1.when < hit2.when) { winner = 'P1'; when = hit1.when } else { winner = 'P2'; when = hit2.when } }
        else if (hit1) { winner = 'P1'; when = hit1.when }
        else if (hit2) { winner = 'P2'; when = hit2.when }

        if (winner) {
          const lockedFor = winner === 'P1' ? 'P2' : 'P1'
          console.log(`[lock] ${r.code} ${prob.contestId}${prob.idx} winner=${winner} when=${new Date(when!).toISOString()}`)
          const updatedProb = await prisma.problem.update({
            where: { id: prob.id },
            data: { solvedBy: winner, solvedAt: new Date(when!), state: 'LOCKED', lockedFor }
          })
          io.to(roomChannel(r.code)).emit('problem:solved', { problem: updatedProb })
        }
        await wait(400)
      }
    } catch (e) {
      console.error('[tick]', e)
    }
  }

  const handle: NodeJS.Timeout = setInterval(tick, 5_000)
  pollers.set(room.id, handle)
  setTimeout(tick, 500)
}

async function stopPolling(roomId: string) {
  const h = pollers.get(roomId)
  if (h) { clearInterval(h); pollers.delete(roomId) }
}


function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }
