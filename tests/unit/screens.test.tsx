import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSessionStore } from '../../src/renderer/store/useSessionStore';
import WelcomeScreen from '../../src/renderer/screens/WelcomeScreen';
import EmailScreen from '../../src/renderer/screens/EmailScreen';
import CompleteScreen from '../../src/renderer/screens/CompleteScreen';
import ErrorScreen from '../../src/renderer/screens/ErrorScreen';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('renders studio name', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Bayside Video Studio')).toBeInTheDocument();
  });

  it('renders tap to begin button', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Tap to Begin')).toBeInTheDocument();
  });

  it('transitions to email screen on tap', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Tap to Begin'));
    expect(useSessionStore.getState().screen).toBe('email');
  });
});

describe('EmailScreen', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    useSessionStore.getState().setScreen('email');
  });

  it('renders email prompt', () => {
    render(<EmailScreen />);
    expect(screen.getByText('Enter Your Email')).toBeInTheDocument();
  });

  it('has disabled continue button with empty email', () => {
    render(<EmailScreen />);
    expect(screen.getByText('Continue')).toBeDisabled();
  });
});

describe('CompleteScreen', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    useSessionStore.getState().setScreen('complete');
    useSessionStore.getState().setEmail('user@test.com');
    useSessionStore.getState().setPlaybackUrl('https://stream.mux.com/abc.m3u8');
  });

  it('shows check your email message', () => {
    render(<CompleteScreen />);
    expect(screen.getByText('Check Your Email!')).toBeInTheDocument();
  });

  it('displays user email', () => {
    render(<CompleteScreen />);
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
  });
});

describe('ErrorScreen', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('shows error message', () => {
    useSessionStore.getState().setError('Upload failed');
    render(<ErrorScreen />);
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('has start over button', () => {
    useSessionStore.getState().setError('test error');
    render(<ErrorScreen />);
    expect(screen.getByText('Start Over')).toBeInTheDocument();
  });
});
