import { Controls } from './components/Controls'
import { CanvasView } from './components/CanvasView'
import { TopBar } from './components/TopBar'
import { ExportPanel } from './components/ExportPanel'

export default function App () {
  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      <TopBar />
      <div className="grid grid-cols-[320px_1fr_320px] h-full">
        <aside className="p-3 border-r border-neutral-200 dark:border-neutral-800 overflow-auto">
          <Controls />
        </aside>
        <main className="overflow-auto">
          <CanvasView />
        </main>
        <aside className="p-3 border-l border-neutral-200 dark:border-neutral-800 overflow-auto">
          <ExportPanel />
        </aside>
      </div>
    </div>
  )
}


