'use client';

import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import WikipediaGameBoard from '../components/WikipediaGameBoard';
import { NodeProvider } from '../contexts/NodeContext';
import { useGameWords } from '../contexts/GameWordsContext';
import { useSearchParams } from 'next/navigation';

export default function GameScreen() {
  const [gameStarted, setGameStarted] = useState(false);
  const { startWord } = useGameWords();
  const searchParams = useSearchParams();
  const useLocal = searchParams.get('useLocal') === 'true';

  return (
    <>
      {!gameStarted && useLocal ? (
        <WelcomeScreen onGameStart={() => setGameStarted(true)} />
      ) : (
        <NodeProvider startWord={startWord}>
          <WikipediaGameBoard />
        </NodeProvider>
      )}
    </>
  );
} 