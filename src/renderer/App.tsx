import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSessionStore } from './store/useSessionStore';
import { useAutoReset } from './hooks/useAutoReset';
import { useIdleTimeout } from './hooks/useIdleTimeout';

import HomeScreen from './screens/HomeScreen';
import CountdownScreen from './screens/CountdownScreen';
import RecordingScreen from './screens/RecordingScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import CompleteScreen from './screens/CompleteScreen';
import ErrorScreen from './screens/ErrorScreen';
import UnavailableScreen from './screens/UnavailableScreen';

import type { Screen } from '../shared/types';

const screenMap: Record<Screen, React.ComponentType> = {
  home: HomeScreen,
  countdown: CountdownScreen,
  recording: RecordingScreen,
  processing: ProcessingScreen,
  complete: CompleteScreen,
  error: ErrorScreen,
  unavailable: UnavailableScreen,
};

export default function App() {
  const screen = useSessionStore((s) => s.screen);
  const setError = useSessionStore((s) => s.setError);

  useAutoReset();
  useIdleTimeout();

  useEffect(() => {
    const cleanup = window.baysideAPI.onError((error) => {
      setError(error);
    });
    return cleanup;
  }, [setError]);

  const ScreenComponent = screenMap[screen] ?? HomeScreen;

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-base font-sans">
      <AnimatePresence mode="wait">
        <ScreenComponent key={screen} />
      </AnimatePresence>
    </div>
  );
}
