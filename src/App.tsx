function App() {
  return (
    <main className="min-h-screen bg-ivory px-6 py-10 text-graphite sm:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col">
        <header className="border-b border-sand pb-6">
          <p className="text-sm font-semibold tracking-[0.18em] uppercase">Valuarte</p>
        </header>
        <section className="flex flex-1 flex-col justify-center py-20">
          <p className="mb-5 text-sm font-semibold tracking-[0.16em] text-terracotta uppercase">
            Para artistas visuales
          </p>
          <h1 className="max-w-3xl font-serif text-5xl leading-tight sm:text-7xl">
            Tu trabajo creativo tiene valor.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed">
            Un espacio para pensar el precio de tu obra con claridad.
          </p>
          <p className="mt-8 text-sm">Estamos preparando Valuarte.</p>
        </section>
        <footer className="border-t border-sand pt-6 text-sm">
          Hecho para acompañar tu práctica artística.
        </footer>
      </div>
    </main>
  )
}

export default App
