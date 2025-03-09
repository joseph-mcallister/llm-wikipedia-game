'use client';

import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import WikipediaGameBoard from '../components/WikipediaGameBoard';
import { NodeProvider } from '../contexts/NodeContext';
import { useGameWords } from '../contexts/GameWordsContext';

export default function GameScreen() {
  const [gameStarted, setGameStarted] = useState(false);
  const { startWord } = useGameWords();

  return (
    <>
      {!gameStarted ? (
        <WelcomeScreen onGameStart={() => setGameStarted(true)} />
      ) : (
        <NodeProvider startWord={startWord}>
          <WikipediaGameBoard />
        </NodeProvider>
      )}
    </>
  );
} 