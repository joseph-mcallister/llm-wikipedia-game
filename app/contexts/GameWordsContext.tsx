"use client";

import React, { createContext, useContext } from 'react';
import { useSearchParams } from 'next/navigation';

const DEFAULT_WORDS = ['USA', 'Elon Musk'];

const DAILY_WORDS: Record<string, [string, string]> = {
  '2025-05-09': ['USA', 'Elon Musk'],
  '2025-05-10': ['Bitcoin', 'China'],
  '2025-05-11': ['SpaceX', 'Italy'],
  '2025-05-12': ['Germany', 'Tennis'],
  '2025-05-13': ['Brazil', 'Wine'],
  '2025-05-14': ['Brazil', 'Futebol'],
  '2025-05-15': ['Dance', 'Grape'],
  '2025-05-16': ['France', 'Wine'],
  '2025-05-17': ['Italy', 'Soccer'],
  '2025-05-18': ['Germany', 'Tennis'],
  '2025-05-19': ['Brazil', 'Monkey'],
  '2025-05-20': ['Dance', 'Grape'],
  '2025-05-21': ['France', 'Soda'],
  '2025-05-22': ['Italy', 'Soccer'],
  '2025-05-23': ['Tesla', 'Hollywood'],
  '2025-05-24': ['Dinosaur', 'Oil'],
  '2025-05-25': ['Elephant', 'Steve Jobs'],
  '2025-05-26': ['Soccer', 'China'],
  '2025-05-27': ['Pizza', 'Mountains'],
  '2025-05-28': ['Beach', 'Coffee'],
  '2025-05-29': ['Books', 'Rainbow'],
  '2025-05-30': ['Piano', 'Volcano'],
  '2025-05-31': ['Dolphin', 'Castle'],
  '2025-06-01': ['Guitar', 'Desert'],
  '2025-06-02': ['Basketball', 'Ocean'],
  '2025-06-03': ['Butterfly', 'Pizza'],
  '2025-06-04': ['Sunset', 'Bicycle'],
  '2025-06-05': ['Mountain', 'Chocolate'],
  '2025-06-06': ['Rainbow', 'Garden'],
  '2025-06-07': ['Beach', 'Piano'],
  '2025-06-08': ['Castle', 'Coffee'],
  '2025-06-09': ['Dolphin', 'Guitar'],
  '2025-06-10': ['Volcano', 'Basketball'],
  '2025-06-11': ['Desert', 'Butterfly'],
  '2025-06-12': ['Ocean', 'Sunset'],
  '2025-06-13': ['Bicycle', 'Mountain'],
  '2025-06-14': ['Chocolate', 'Garden'],
  '2025-06-15': ['Astronomy', 'Sushi'],
  '2025-06-16': ['Photography', 'Jazz'],
  '2025-06-17': ['Architecture', 'Sailing'],
  '2025-06-18': ['Poetry', 'Cricket'],
  '2025-06-19': ['Sculpture', 'Chess'],
  '2025-06-20': ['Ballet', 'Meteorology'],
  '2025-06-21': ['Philosophy', 'Rugby'],
  '2025-06-22': ['Opera', 'Geology'],
  '2025-06-23': ['Painting', 'Hockey'],
  '2025-06-24': ['Theater', 'Botany'],
  '2025-06-25': ['Symphony', 'Archery'],
  '2025-06-26': ['Cinema', 'Anthropology'],
  '2025-06-27': ['Comedy', 'Archaeology'],
  '2025-06-28': ['Fashion', 'Psychology'],
  '2025-06-29': ['Cuisine', 'Mathematics'],
  '2025-06-30': ['Literature', 'Chemistry'],
  '2025-07-01': ['History', 'Physics'],
  '2025-07-02': ['Geography', 'Biology'],
  '2025-07-03': ['Politics', 'Astronomy'],
  '2025-07-04': ['Mythology', 'Robotics'],
  '2025-07-05': ['Folklore', 'Nanotechnology'],
  '2025-07-06': ['Legends', 'Biotechnology'],
  '2025-07-07': ['Fables', 'Genetics'],
  '2025-07-08': ['Epics', 'Quantum'],
  '2025-07-09': ['Sagas', 'Neuroscience'],
  '2025-07-10': ['Tales', 'Immunology'],
  '2025-07-11': ['Mysteries', 'Virology'],
  '2025-07-12': ['Riddles', 'Epidemiology'],
  '2025-07-13': ['Puzzles', 'Microbiology'],
  '2025-07-14': ['Enigmas', 'Biochemistry'],
  '2025-07-15': ['Paradoxes', 'Pharmacology'],
  '2025-07-16': ['Conundrums', 'Toxicology'],
  '2025-07-17': ['Dilemmas', 'Pathology'],
  '2025-07-18': ['Quandaries', 'Oncology'],
  '2025-07-19': ['Predicaments', 'Cardiology'],
  '2025-07-20': ['Scenarios', 'Neurology'],
  '2025-07-21': ['Situations', 'Psychiatry'],
  '2025-07-22': ['Circumstances', 'Dermatology'],
  '2025-07-23': ['Eiffel Tower', 'Mozart'],
  '2025-07-24': ['Taj Mahal', 'Einstein'],
  '2025-07-25': ['Great Wall', 'Shakespeare'],
  '2025-07-26': ['Pyramids', 'Beethoven'],
  '2025-07-27': ['Colosseum', 'Da Vinci'],
  '2025-07-28': ['Machu Picchu', 'Picasso'],
  '2025-07-29': ['Statue of Liberty', 'Michelangelo'],
  '2025-07-30': ['Petra', 'Van Gogh'],
  '2025-07-31': ['Angkor Wat', 'Mozart'],
  '2025-08-01': ['Christ the Redeemer', 'Bach'],
  '2025-08-02': ['Stonehenge', 'Rembrandt'],
  '2025-08-03': ['Acropolis', 'Monet'],
  '2025-08-04': ['Hagia Sophia', 'Chopin'],
  '2025-08-05': ['Alhambra', 'Tchaikovsky'],
  '2025-08-06': ['Notre Dame', 'Wagner'],
  '2025-08-07': ['Versailles', 'Debussy'],
  '2025-08-08': ['Parthenon', 'Vivaldi'],
  '2025-08-09': ['Sistine Chapel', 'Raphael'],
  '2025-08-10': ['St. Peter\'s Basilica', 'Donatello'],
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