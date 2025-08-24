import { useId } from 'react'

interface Props {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
}

export function Slider ({ label, min, max, step = 1, value, onChange }: Props) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-neutral-600 dark:text-neutral-300 flex justify-between">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  )
}


