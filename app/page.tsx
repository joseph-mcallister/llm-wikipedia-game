import WebGPUStatus from "./components/WebGPUStatus";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="w-xs">
        <WebGPUStatus />
      </header>
      <main className="flex flex-col gap-8 items-center text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">The Wikipedia Game...but with LLMs</h1>
        <div className="text-left w-full">
          <h2 className="text-xl font-semibold mb-4">How it works:</h2>
          <ol className="list-decimal list-inside space-y-4 text-lg">
            <li>Download an LLM that runs directly in your browser</li>
            <li>Recieve a starting wikipedia page and target wikipedia page</li>
            <li>The LLM will begin describing the starting topic</li>
            <li>Click any subtopic in their output to guide the to the next topic</li>
            <li>Repeat until the LLM outputs your target wikipedia page</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
