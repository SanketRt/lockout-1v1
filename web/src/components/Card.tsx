import { PropsWithChildren } from 'react'
export default function Card({ children }: PropsWithChildren) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-lg">{children}</div>
}
