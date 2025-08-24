import { useEffect } from 'react'
import { Button } from './ui/Button'
import { useStore } from '@/state/useStore'

export function TopBar () {
  const setImage = useStore(s => s.setImage)

  function onPaste (e: React.ClipboardEvent) {
    console.log('[TopBar] paste event')
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      console.log('[TopBar] pasted image -> dataUrl size chars:', String(reader.result).length)
      setImage(String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  function onFile (e: React.ChangeEvent<HTMLInputElement>) {
    console.log('[TopBar] file input change')
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      console.log('[TopBar] uploaded image -> dataUrl size chars:', String(r.result).length)
      setImage(String(r.result))
    }
    r.readAsDataURL(f)
  }

  // Global paste handler so you can paste anywhere on the page
  useEffect(() => {
    function onWindowPaste (e: ClipboardEvent) {
      console.log('[TopBar] window paste event')
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile(); if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        console.log('[TopBar] window pasted image -> dataUrl size chars:', String(reader.result).length)
        setImage(String(reader.result))
      }
      reader.readAsDataURL(file)
    }
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [setImage])

  return (
    <div className="flex items-center gap-3 p-2 border-b border-neutral-200 dark:border-neutral-800" onPaste={onPaste}>
      <label className="text-xs text-neutral-600 dark:text-neutral-300">Paste an image (Cmd+V) or upload:</label>
      <input type="file" accept="image/*" onChange={onFile} />
      <Button onClick={() => setImage(null)}>Clear</Button>
    </div>
  )
}


