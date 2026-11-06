import { Calculator } from './features/calculator/Calculator'

function App() {
  return (
    <main className="min-h-screen bg-ivory px-4 py-8 text-graphite sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <header className="flex items-center justify-between gap-3 border-b-2 border-graphite pb-5">
          <p className="min-w-0 font-mono text-base font-bold tracking-[0.12em] uppercase">Valuarte<span aria-hidden="true" className="text-terracotta">.</span></p>
          <span className="shrink-0 border-2 border-graphite bg-accent px-2 py-1 font-mono text-xs font-bold">MVP / 01</span>
        </header>
        <section className="pt-12 pb-10 sm:pt-16 sm:pb-12">
          <p className="mb-5 font-mono text-sm font-bold tracking-[0.12em] uppercase">
            Para artistas visuales
          </p>
          <h1 className="max-w-3xl break-words font-serif text-4xl leading-[1.08] font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Tu trabajo creativo tiene valor.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed">
            Un espacio para pensar el precio de tu obra con claridad.
          </p>
        </section>
        <Calculator />
        <footer className="mt-20 border-t-2 border-graphite pt-6 font-sans text-sm">
          Hecho para acompañar tu práctica artística.
        </footer>
      </div>
    </main>
  )
}

export default App
