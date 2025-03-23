"use client";

import React, { createContext, useContext } from 'react';
import { useSearchParams } from 'next/navigation';

const DEFAULT_WORDS = ['USA', 'Elon Musk'];

const DAILY_WORDS: Record<string, [string, string]> = {
  '2025-03-09': ['USA', 'Elon Musk'],
  '2025-03-10': ['Bitcoin', 'China'],
  '2025-03-11': ['SpaceX', 'Italy'],
  '2025-03-16': ['Germany', 'Tennis'],
  '2025-03-17': ['Brazil', 'Wine'],
  '2025-03-20': ['Brazil', 'Futebol'],
  '2025-03-21': ['Dance', 'Grape'],
  '2025-03-22': ['France', 'Wine'],
  '2025-03-23': ['Italy', 'Soccer'],
  '2025-03-24': ['Germany', 'Tennis'],
  '2025-03-25': ['Brazil', 'Monkey'],
  '2025-03-26': ['Dance', 'Grape'],
  '2025-03-27': ['France', 'Soda'],
  '2025-03-28': ['Italy', 'Soccer'],
  '2025-03-29': ['Tesla', 'Hollywood'],
  '2025-03-30': ['Dinosaur', 'Oil'],
  '2025-03-31': ['Elephant', 'Steve Jobs'],
  '2025-04-01': ['Soccer', 'China'],
};

interface GameWordsContextType {
  startWord: string;
  endWord: string;
}

const GameWordsContext = createContext<GameWordsContextType | null>(null);

export function GameWordsProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  let startWord: string;
  let endWord: string;

  if (searchParams?.has('start') && searchParams?.has('end')) {
    startWord = searchParams.get('start') as string;
    endWord = searchParams.get('end') as string;
  } else {
    const today = new Date().toISOString().split('T')[0];
    [startWord, endWord] = DAILY_WORDS[today] || DEFAULT_WORDS;
  }

  return (
    <GameWordsContext.Provider value={{ startWord, endWord }}>
      {children}
    </GameWordsContext.Provider>
  );
}

export function useGameWords() {
  const context = useContext(GameWordsContext);
  if (!context) {
    throw new Error('useGameWords must be used within a GameWordsProvider');
  }
  return context;
}