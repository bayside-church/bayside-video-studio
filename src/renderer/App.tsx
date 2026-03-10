import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSessionStore } from './store/useSessionStore';
import { useAutoReset } from './hooks/useAutoReset';
import { useIdleTimeout } from './hooks/useIdleTimeout';

import WelcomeScreen from './screens/WelcomeScreen';
import EmailScreen from './screens/EmailScreen';
import PreRecordScreen from './screens/PreRecordScreen';
import CountdownScreen from './screens/CountdownScreen';
import RecordingScreen from './screens/RecordingScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import CompleteScreen from './screens/CompleteScreen';
import ErrorScreen from './screens/ErrorScreen';
import UnavailableScreen from './screens/UnavailableScreen';

import type { Screen } from '../shared/types';

const screenMap: Record<Screen, React.ComponentType> = {
  welcome: WelcomeScreen,
  email: EmailScreen,
  preRecord: PreRecordScreen,
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

  // Listen for errors from main process
  useEffect(() => {
    const cleanup = window.baysideAPI.onError((error) => {
      setError(error);
    });
    return cleanup;
  }, [setError]);

  const ScreenComponent = screenMap[screen] ?? WelcomeScreen;

  return (
    <div className="h-screen w-screen overflow-hidden bg-bayside-dark">
      <AnimatePresence mode="wait">
        <ScreenComponent key={screen} />
      </AnimatePresence>
    </div>
  );
}
