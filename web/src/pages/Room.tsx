import axios from 'axios'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:5177'

export default function Room() {
  const { code } = useParams()
  const [sp] = useSearchParams()
  const as = (sp.get('as') === 'p2' ? 'p2' : 'p1') as 'p1'|'p2'
  const [room, setRoom] = useState<any | null>(null)
  const [starting, setStarting] = useState(false)
  const sockRef = useRef<Socket | null>(null)

  const meHandle = room ? (as==='p1' ? room.p1Handle : room.p2Handle) : ''
  const oppHandle = room ? (as==='p1' ? room.p2Handle : room.p1Handle) : ''

  useEffect(() => {
    const s = io(API)
    sockRef.current = s
    s.emit('join-room', { code })
    s.on('room:update', ({ room }) => setRoom(room))
    s.on('problem:solved', ({ problem }) => {
      setRoom((r:any) => ({...r, problems: r.problems.map((p:any) => p.id===problem.id ? problem : p)}))
    })
    return () => { s.disconnect() }
  }, [code])

  useEffect(() => { (async () => {
    const { data } = await axios.get(`${API}/api/rooms/${code}`)
    setRoom(data.room)
  })() }, [code])

  async function start() {
    setStarting(true)
    await axios.post(`${API}/api/rooms/${code}/start`)
    setStarting(false)
  }

  const now = Date.now()
  const timeLeftMs = room?.endAt ? new Date(room.endAt).getTime() - now : 0
  const status = room?.state

  if (!room) return <div className="p-6"><Spinner/></div>

  const p1Score = room.problems.filter((p:any)=>p.solvedBy==='P1').length
  const p2Score = room.problems.filter((p:any)=>p.solvedBy==='P2').length

  return (
    <div className="grid gap-6">
      <Card>
        <div className="p-6 grid md:grid-cols-3 gap-4 items-center">
          <div>
            <div className="text-sm text-zinc-400">Room</div>
            <div className="text-xl font-semibold">{code}</div>
          </div>
          <div className="grid">
            <div className="text-sm text-zinc-400">Players</div>
            <div className="flex items-center gap-2 text-lg">
              <span className={as==='p1'? 'font-bold' : ''}>{room.p1Handle}</span>
              <span className="text-zinc-500">vs</span>
              <span className={as==='p2'? 'font-bold' : ''}>{room.p2Handle}</span>
            </div>
          </div>
          <div className="grid justify-end">
            <div className="text-sm text-zinc-400">Status</div>
            <div className="flex items-center gap-2">
              <Badge>{status}</Badge>
              {status==='PENDING' && (
                <button onClick={start} disabled={starting} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm">
                  {starting? 'Starting…' : 'Start Match'}
                </button>
              )}
              {status!=='PENDING' && (
                <Timer endAt={room.endAt}/>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-zinc-400">Score</div>
            <div className="text-2xl font-semibold flex items-center gap-6">
              <span className={as==='p1'? 'text-white' : 'text-zinc-300'}>P1: {p1Score}</span>
              <span className={as==='p2'? 'text-white' : 'text-zinc-300'}>P2: {p2Score}</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-zinc-400">
              <tr className="text-left">
                <th className="py-2">#</th>
                <th>Name</th>
                <th>Contest</th>
                <th>Rating</th>
                <th>Status</th>
                <th className="text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {room.problems.map((p:any, i:number) => {
                const isLockedForMe = p.lockedFor === (as==='p1' ? 'P1':'P2')
                const solved = p.solvedBy !== null
                const url = `https://codeforces.com/problemset/problem/${p.contestId}/${p.idx}`
                return (
                  <tr key={p.id} className="border-t border-zinc-800">
                    <td className="py-2 pr-2 align-top text-zinc-400">{i+1}</td>
                    <td className="py-2 pr-2 align-top">{p.name}</td>
                    <td className="py-2 pr-2 align-top">{p.contestId}{p.idx}</td>
                    <td className="py-2 pr-2 align-top">{p.rating ?? '-'}</td>
                    <td className="py-2 pr-2 align-top">
                      {solved ? (
                        <Badge>Solved by {p.solvedBy}</Badge>
                      ) : isLockedForMe ? (
                        <Badge>Locked</Badge>
                      ) : (
                        <Badge>Open</Badge>
                      )}
                    </td>
                    <td className="py-2 align-top text-right">
                      {isLockedForMe ? (
                        <span className="text-zinc-500">—</span>
                      ) : (
                        <a className="underline" href={url} target="_blank" rel="noreferrer">Problem</a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="p-6 text-sm text-zinc-400">
          You are <span className="text-zinc-200 font-medium">{as.toUpperCase()}</span> · Your handle: <span className="text-zinc-200">{meHandle}</span> · Opponent: <span className="text-zinc-200">{oppHandle}</span>
          <div className="mt-2">Share links: <code className="bg-zinc-900 px-2 py-1 rounded">{location.origin + `/room/${code}?as=p1`}</code> · <code className="bg-zinc-900 px-2 py-1 rounded">{location.origin + `/room/${code}?as=p2`}</code></div>
        </div>
      </Card>
    </div>
  )
}

function Timer({ endAt }: { endAt?: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(t) }, [])
  if (!endAt) return null
  const diff = Math.max(0, new Date(endAt).getTime() - now)
  const mm = Math.floor(diff/60000).toString().padStart(2,'0')
  const ss = Math.floor((diff%60000)/1000).toString().padStart(2,'0')
  return <Badge>{mm}:{ss}</Badge>
}
