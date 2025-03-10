export type ActionType = 'broader' | 'deeper' | 'similar' | 'opposite' | 'people' | 'places' | 'good' | 'evil' | 'future' | 'past';

export const ACTIONS: { type: ActionType; label: string; prompt: string; }[] = [
  { 
    type: 'broader', 
    label: 'Broader',
    prompt: 'Respond with {n} broader topics that encompass "{topic}", as a comma-separated list with no other text or punctuation. Example format: broader1, broader2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'deeper', 
    label: 'Deeper',
    prompt: 'Respond with {n} more specific subtopics of "{topic}", as a comma-separated list with no other text or punctuation. Example format: subtopic1, subtopic2, subtopic3. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'similar', 
    label: 'Similar',
    prompt: 'Respond with {n} closely related topics to "{topic}", as a comma-separated list with no other text or punctuation. Example format: topic1, topic2, topic3, topic4. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'opposite', 
    label: 'Opposite',
    prompt: 'Respond with {n} conceptual opposites of "{topic}", as a comma-separated list with no other text or punctuation. Example format: opposite1, opposite2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'people', 
    label: 'People',
    prompt: 'Respond with {n} notable people closely associated with "{topic}", as a comma-separated list with no other text or punctuation. Example format: person1, person2, person3, person4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'places', 
    label: 'Places',
    prompt: 'Respond with {n} significant places related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: place1, place2, place3, place4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'good', 
    label: 'Good',
    prompt: 'Respond with {n} "good" (as in opposite of evil) things related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: place1, place2, place3, place4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'evil', 
    label: 'Evil',
    prompt: 'Respond with {n} "evil" things related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: place1, place2, place3, place4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'future', 
    label: 'Future',
    prompt: 'Respond with {n} future developments related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: future1, future2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'past', 
    label: 'Past',
    prompt: 'Respond with {n} historical aspects of "{topic}", as a comma-separated list with no other text or punctuation. Example format: past1, past2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  }
];

export const ACTION_COLORS: Record<ActionType, string> = {
  broader: '#9C27B0',     // Purple
  deeper: '#2196F3',      // Blue
  similar: '#4CAF50',     // Green
  opposite: '#F44336',    // Red
  people: '#00BCD4',      // Cyan
  places: '#FFEB3B',      // Yellow
  good: '#8BC34A',        // Light Green
  evil: '#607D8B',        // Blue Grey
  future: '#FF9800',      // Orange
  past: '#795548'         // Brown
};

export const MIN_NODE_DISTANCE = 100; // Minimum distance between nodes
export const MAX_PLACEMENT_ATTEMPTS = 50; // Maximum number of attempts to place a node 