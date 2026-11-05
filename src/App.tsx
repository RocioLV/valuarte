import { Calculator } from './features/calculator/Calculator'

function App() {
  return (
    <main className="min-h-screen bg-ivory px-6 py-10 text-graphite sm:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between border-b-2 border-graphite pb-5">
          <p className="font-mono text-base font-bold tracking-[0.12em] uppercase">Valuarte<span aria-hidden="true" className="text-terracotta">.</span></p>
          <span className="border-2 border-graphite bg-accent px-2 py-1 font-mono text-xs font-bold">MVP / 01</span>
        </header>
        <section className="pt-12 pb-10 sm:pt-16 sm:pb-12">
          <p className="mb-5 font-mono text-sm font-bold tracking-[0.12em] uppercase">
            Para artistas visuales
          </p>
          <h1 className="max-w-3xl font-serif text-5xl leading-tight font-bold tracking-tight sm:text-7xl">
            Tu trabajo creativo tiene valor.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed">
            Un espacio para pensar el precio de tu obra con claridad.
          </p>
        </section>
        <Calculator />
        <footer className="mt-20 border-t-2 border-graphite pt-6 font-mono text-sm">
          Hecho para acompañar tu práctica artística.
        </footer>
      </div>
    </main>
  )
}

export default App
