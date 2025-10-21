import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Field from '../components/Field'

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:5177'

export default function CreateRoom() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    p1Handle: '', p2Handle: '',
    ratingMin: 1200, ratingMax: 1800,
    problemCount: 3, durationMinutes: 60,
  })

  async function create() {
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/rooms`, form)
      nav(`/room/${data.code}?as=p1`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <div className="p-6 grid gap-4">
          <h2 className="text-xl font-semibold">Create 1v1 Room</h2>
          <div className="grid gap-3">
            <Field label="Player 1 (CF handle)">
              <input className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2" value={form.p1Handle} onChange={e=>setForm({...form,p1Handle:e.target.value})} />
            </Field>
            <Field label="Player 2 (CF handle)">
              <input className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2" value={form.p2Handle} onChange={e=>setForm({...form,p2Handle:e.target.value})} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Count">
                <input type="number" min={1} max={10} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2" value={form.problemCount} onChange={e=>setForm({...form,problemCount:Number(e.target.value)})} />
              </Field>
              <Field label="Rating min">
                <input type="number" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2" value={form.ratingMin} onChange={e=>setForm({...form,ratingMin:Number(e.target.value)})} />
              </Field>
              <Field label="Rating max">
                <input type="number" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2" value={form.ratingMax} onChange={e=>setForm({...form,ratingMax:Number(e.target.value)})} />
              </Field>
            </div>
            <Field label="Duration (minutes)">
              <input type="number" min={5} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2" value={form.durationMinutes} onChange={e=>setForm({...form,durationMinutes:Number(e.target.value)})} />
            </Field>
          </div>
          <button onClick={create} disabled={loading} className="mt-2 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg">
            {loading && <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"/>}
            Create Room
          </button>
        </div>
      </Card>
      <Card>
        <div className="p-6">
          <h3 className="font-semibold mb-2">Rules</h3>
          <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
            <li>Same problem list for both players</li>
            <li>First to solve a problem locks it for the opponent</li>
            <li>Problems filtered by rating and exclude Kotlin Heroes</li>
            <li>Auto detection via Codeforces submissions polling</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
