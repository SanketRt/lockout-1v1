type Props = { label: string, children: React.ReactNode }
export default function Field({ label, children }: Props) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-300">{label}</span>
      {children}
    </label>
  )
}
