"use client";

import React, { createContext, useContext } from 'react';
import { useSearchParams } from 'next/navigation';

const DEFAULT_WORDS = ['USA', 'Elon Musk'];

const DAILY_WORDS: Record<string, [string, string]> = {
  '2025-12-17': ['Elon Musk', 'France'],
  '2025-12-18': ['Bitcoin', 'China'],
  '2025-12-19': ['SpaceX', 'Italy'],
  '2025-12-20': ['Germany', 'Tennis'],
  '2025-12-21': ['Brazil', 'Wine'],
  '2025-12-22': ['Brazil', 'Futebol'],
  '2025-12-23': ['Dance', 'Grape'],
  '2025-12-24': ['France', 'Wine'],
  '2025-12-25': ['Italy', 'Soccer'],
  '2025-12-26': ['Germany', 'Tennis'],
  '2025-12-27': ['Brazil', 'Monkey'],
  '2025-12-28': ['Dance', 'Grape'],
  '2025-12-29': ['France', 'Soda'],
  '2025-12-30': ['Italy', 'Soccer'],
  '2025-12-31': ['Tesla', 'Hollywood'],
  '2026-01-01': ['Dinosaur', 'Oil'],
  '2026-01-02': ['Elephant', 'Steve Jobs'],
  '2026-01-03': ['Soccer', 'China'],
  '2026-01-04': ['Pizza', 'Mountains'],
  '2026-01-05': ['Beach', 'Coffee'],
  '2026-01-06': ['Books', 'Rainbow'],
  '2026-01-07': ['Piano', 'Volcano'],
  '2026-01-08': ['Dolphin', 'Castle'],
  '2026-01-09': ['Guitar', 'Desert'],
  '2026-01-10': ['Basketball', 'Ocean'],
  '2026-01-11': ['Butterfly', 'Pizza'],
  '2026-01-12': ['Sunset', 'Bicycle'],
  '2026-01-13': ['Mountain', 'Chocolate'],
  '2026-01-14': ['Rainbow', 'Garden'],
  '2026-01-15': ['Beach', 'Piano'],
  '2026-01-16': ['Castle', 'Coffee'],
  '2026-01-17': ['Dolphin', 'Guitar'],
  '2026-01-18': ['Volcano', 'Basketball'],
  '2026-01-19': ['Desert', 'Butterfly'],
  '2026-01-20': ['Ocean', 'Sunset'],
  '2026-01-21': ['Bicycle', 'Mountain'],
  '2026-01-22': ['Chocolate', 'Garden'],
  '2026-01-23': ['Astronomy', 'Sushi'],
  '2026-01-24': ['Photography', 'Jazz'],
  '2026-01-25': ['Architecture', 'Sailing'],
  '2026-01-26': ['Poetry', 'Cricket'],
  '2026-01-27': ['Sculpture', 'Chess'],
  '2026-01-28': ['Ballet', 'Meteorology'],
  '2026-01-29': ['Philosophy', 'Rugby'],
  '2026-01-30': ['Opera', 'Geology'],
  '2026-01-31': ['Painting', 'Hockey'],
  '2026-02-01': ['Theater', 'Botany'],
  '2026-02-02': ['Symphony', 'Archery'],
  '2026-02-03': ['Cinema', 'Anthropology'],
  '2026-02-04': ['Comedy', 'Archaeology'],
  '2026-02-05': ['Fashion', 'Psychology'],
  '2026-02-06': ['Cuisine', 'Mathematics'],
  '2026-02-07': ['Literature', 'Chemistry'],
  '2026-02-08': ['History', 'Physics'],
  '2026-02-09': ['Geography', 'Biology'],
  '2026-02-10': ['Politics', 'Astronomy'],
  '2026-02-11': ['Mythology', 'Robotics'],
  '2026-02-12': ['Folklore', 'Nanotechnology'],
  '2026-02-13': ['Legends', 'Biotechnology'],
  '2026-02-14': ['Fables', 'Genetics'],
  '2026-02-15': ['Epics', 'Quantum'],
  '2026-02-16': ['Sagas', 'Neuroscience'],
  '2026-02-17': ['Tales', 'Immunology'],
  '2026-02-18': ['Mysteries', 'Virology'],
  '2026-02-19': ['Riddles', 'Epidemiology'],
  '2026-02-20': ['Puzzles', 'Microbiology'],
  '2026-02-21': ['Enigmas', 'Biochemistry'],
  '2026-02-22': ['Paradoxes', 'Pharmacology'],
  '2026-02-23': ['Conundrums', 'Toxicology'],
  '2026-02-24': ['Dilemmas', 'Pathology'],
  '2026-02-25': ['Quandaries', 'Oncology'],
  '2026-02-26': ['Predicaments', 'Cardiology'],
  '2026-02-27': ['Scenarios', 'Neurology'],
  '2026-02-28': ['Situations', 'Psychiatry'],
  '2026-03-01': ['Circumstances', 'Dermatology'],
  '2026-03-02': ['Eiffel Tower', 'Mozart'],
  '2026-03-03': ['Taj Mahal', 'Einstein'],
  '2026-03-04': ['Great Wall', 'Shakespeare'],
  '2026-03-05': ['Pyramids', 'Beethoven'],
  '2026-03-06': ['Colosseum', 'Da Vinci'],
  '2026-03-07': ['Machu Picchu', 'Picasso'],
  '2026-03-08': ['Statue of Liberty', 'Michelangelo'],
  '2026-03-09': ['Petra', 'Van Gogh'],
  '2026-03-10': ['Angkor Wat', 'Mozart'],
  '2026-03-11': ['Christ the Redeemer', 'Bach'],
  '2026-03-12': ['Stonehenge', 'Rembrandt'],
  '2026-03-13': ['Acropolis', 'Monet'],
  '2026-03-14': ['Hagia Sophia', 'Chopin'],
  '2026-03-15': ['Alhambra', 'Tchaikovsky'],
  '2026-03-16': ['Notre Dame', 'Wagner'],
  '2026-03-17': ['Versailles', 'Debussy'],
  '2026-03-18': ['Parthenon', 'Vivaldi'],
  '2026-03-19': ['Sistine Chapel', 'Raphael'],
  '2026-03-20': ['St. Peter\'s Basilica', 'Donatello'],
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