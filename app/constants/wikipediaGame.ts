export type ActionType = 'expand' | 'opposite' | 'deeper' | 'broader' | 'timeForward' | 'timeBackward' | 'surprise' | 'people' | 'places' | 'good' | 'evil' | 'things' | 'examples';

export const ACTIONS: { type: ActionType; label: string; prompt: string; }[] = [
  { 
    type: 'expand', 
    label: 'Expand',
    prompt: 'Respond with {n} closely related topics to "{topic}", as a comma-separated list with no other text or punctuation. Example format: topic1, topic2, topic3, topic4. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
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
    type: 'things', 
    label: 'Things',
    prompt: 'Respond with {n} significant things related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: place1, place2, place3, place4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
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
    type: 'deeper', 
    label: 'Deeper',
    prompt: 'Respond with {n} more specific subtopics of "{topic}", as a comma-separated list with no other text or punctuation. Example format: subtopic1, subtopic2, subtopic3. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'broader', 
    label: 'Broader',
    prompt: 'Respond with {n} broader topics that encompass "{topic}", as a comma-separated list with no other text or punctuation. Example format: broader1, broader2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'timeForward', 
    label: 'Time →',
    prompt: 'Respond with {n} future developments related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: future1, future2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'timeBackward', 
    label: 'Time ←',
    prompt: 'Respond with {n} historical aspects of "{topic}", as a comma-separated list with no other text or punctuation. Example format: past1, past2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'opposite', 
    label: 'Opposite of',
    prompt: 'Respond with {n} conceptual opposites of "{topic}", as a comma-separated list with no other text or punctuation. Example format: opposite1, opposite2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'examples',
    label: 'Examples',
    prompt: 'Respond with {n} examples of "{topic}", as a comma-separated list with no other text or punctuation. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'surprise', 
    label: 'Surprise me',
    prompt: 'Respond with {n} surprising topic tangentially related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: surprise1, surprise2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
];

export const ACTION_COLORS: Record<ActionType, string> = {
  expand: '#4CAF50',      // Green
  opposite: '#F44336',    // Red
  deeper: '#2196F3',      // Blue
  broader: '#9C27B0',     // Purple
  timeForward: '#FF9800', // Orange
  timeBackward: '#795548',// Brown
  surprise: '#E91E63',    // Pink
  people: '#00BCD4',      // Cyan
  places: '#FFEB3B',      // Yellow
  good: '#8BC34A',        // Light Green
  evil: '#607D8B',        // Blue Grey
  things: '#FFEB3B',      // Yellow
  examples: '#FFEB3B',      // Yellow
};

export const MIN_NODE_DISTANCE = 100; // Minimum distance between nodes
export const MAX_PLACEMENT_ATTEMPTS = 50; // Maximum number of attempts to place a node 