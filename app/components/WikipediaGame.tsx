'use client';

import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import WikipediaGameBoard from './WikipediaGameBoard';

export default function WikipediaGame() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <>
      {!gameStarted ? (
        <WelcomeScreen onGameStart={() => setGameStarted(true)} />
      ) : (
        <WikipediaGameBoard />
      )}
    </>
  );
} 