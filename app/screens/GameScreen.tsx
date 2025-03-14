'use client';

import React, { useState, useEffect } from 'react';
import WelcomeScreen from './WelcomeScreen';
import WikipediaGameBoard from '../components/WikipediaGameBoard';
import { NodeProvider } from '../contexts/NodeContext';
import { useGameWords } from '../contexts/GameWordsContext';
import { useLocalLLMs } from '../constants/environment';

export default function GameScreen() {
  const [gameStarted, setGameStarted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { startWord } = useGameWords();
  const isLocal = useLocalLLMs();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {isLocal && !gameStarted ? (
        <WelcomeScreen onGameStart={() => setGameStarted(true)} />
      ) : (
        <NodeProvider startWord={startWord}>
          <WikipediaGameBoard />
        </NodeProvider>
      )}
    </>
  );
} 