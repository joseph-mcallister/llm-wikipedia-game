import GameScreen from "./screens/GameScreen";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header>
        <h1 className="text-4xl font-bold text-center">The Wikipedia Game...but with LLMs</h1>
      </header>
      <main className="w-full">
        <GameScreen />
      </main>
    </div>
  );
}
