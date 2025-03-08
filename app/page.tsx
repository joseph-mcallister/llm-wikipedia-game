import WikipediaGame from "./components/WikipediaGame";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header>
        <h1 className="text-4xl font-bold mb-8">The Wikipedia Game...but with LLMs</h1>
      </header>
      <main className="w-full">
        <WikipediaGame />
      </main>
    </div>
  );
}
