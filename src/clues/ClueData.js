/**
 * ClueData — defines the rich data for the 5 clues.
 * Each clue is strictly associated with a specific building index.
 */
export const CLUE_DATA = [
  {
    id: 'clue_0',
    buildingIndex: 0, // Abandoned House
    name: 'Torn Journal Page',
    description: 'A bloody page mentioning the old medical center. "They brought it there first...", it reads.',
    icon: '📄',
    type: 'document'
  },
  {
    id: 'clue_1',
    buildingIndex: 1, // Old Medical Center
    name: 'Patient Record #42',
    description: 'Records detailing a strange infection spreading in the village. Patient 42 exhibited violent tendencies.',
    icon: '📋',
    type: 'document'
  },
  {
    id: 'clue_2',
    buildingIndex: 2, // Abandoned Grocery Store
    name: 'Bloody Receipt',
    description: 'A receipt with a cryptic code scrawled on the back in dark red ink.',
    icon: '🧾',
    type: 'clue'
  },
  {
    id: 'clue_3',
    buildingIndex: 3, // Old Warehouse
    name: 'Rusty Gear',
    description: 'A heavy mechanical part that seems to fit into a larger mechanism.',
    icon: '⚙️',
    type: 'object'
  },
  {
    id: 'clue_4',
    buildingIndex: 4, // Abandoned Farmhouse
    name: 'Strange Amulet',
    description: 'An occult object pulsing with a faint, dark energy. It feels cold to the touch.',
    icon: '🧿',
    type: 'artifact'
  }
];
