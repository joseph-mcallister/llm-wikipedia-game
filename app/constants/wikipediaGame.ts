export type ActionType = 'broader' | 'deeper' | 'similar' | 'opposite' | 'people' | 'places' | 'good' | 'evil' | 'future' | 'past';

export const ACTIONS: { type: ActionType; label: string; }[] = [
  { 
    type: 'broader', 
    label: 'Broader',
  },
  { 
    type: 'deeper', 
    label: 'Deeper',
  },
  { 
    type: 'people', 
    label: 'People',
  },
  { 
    type: 'places', 
    label: 'Places',
  },
  { 
    type: 'similar', 
    label: 'Similar',
  },
  { 
    type: 'opposite', 
    label: 'Opposite',
  },
  { 
    type: 'good', 
    label: 'Good',
  },
  { 
    type: 'evil', 
    label: 'Evil',
  },
  { 
    type: 'future', 
    label: 'Future',
  },
  {   
    type: 'past', 
    label: 'Past',
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