import { type InputHTMLAttributes } from 'react'
import { cn } from './utils'

export function Input ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-9 w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-sm', className)} {...props} />
}


