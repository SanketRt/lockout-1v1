import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import CreateRoom from './pages/CreateRoom'
import Room from './pages/Room'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 sticky top-0 backdrop-blur bg-zinc-950/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold">Lockout 1v1</Link>
          <nav className="text-sm text-zinc-400">Minimal 1v1 CF</nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route index element={<CreateRoom />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </main>
    </div>
  )
}
