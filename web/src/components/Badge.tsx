export default function Badge({ children }: { children: string }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs border border-zinc-700 bg-zinc-800">{children}</span>
}
