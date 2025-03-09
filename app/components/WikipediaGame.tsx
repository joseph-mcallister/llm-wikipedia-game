'use client';

import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import WikipediaGameBoard from './WikipediaGameBoard';
import { NodeProvider } from '../contexts/NodeContext';
import { useGameWords } from '../contexts/GameWordsContext';

export default function WikipediaGame() {
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