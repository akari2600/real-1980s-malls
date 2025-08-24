import { type ButtonHTMLAttributes } from 'react'
import { cn } from './utils'

export function Button ({ className, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button 
      className={cn(
        'px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-neutral-900',
        className
      )} 
      disabled={disabled}
      {...props} 
    />
  )
}


