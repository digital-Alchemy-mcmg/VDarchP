import { modelStore } from './src/store/ModelStore.ts';

// Mock localStorage for Node environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

let previousState = modelStore.getState();
let isStateChanged = false;

modelStore.subscribe((newState) => {
  if (newState !== previousState) {
    isStateChanged = true;
  }
});

modelStore.setPhase('P1_INGEST');

if (isStateChanged) {
  console.log('SUCCESS: State reference changed. Re-render will trigger.');
} else {
  console.error('ERROR: State reference did not change. Re-render will NOT trigger.');
  process.exit(1);
}
