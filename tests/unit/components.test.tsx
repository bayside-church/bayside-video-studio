import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BigButton from '../../src/renderer/components/BigButton';
import EmailInput from '../../src/renderer/components/EmailInput';
import ProgressBar from '../../src/renderer/components/ProgressBar';
import Timer from '../../src/renderer/components/Timer';

describe('BigButton', () => {
  it('renders children text', () => {
    render(<BigButton onClick={() => {}}>Click Me</BigButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<BigButton onClick={onClick}>Click</BigButton>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    const onClick = vi.fn();
    render(<BigButton onClick={onClick} disabled>Disabled</BigButton>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('EmailInput', () => {
  it('renders input with placeholder', () => {
    render(<EmailInput value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<EmailInput value="" onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    });
    expect(onChange).toHaveBeenCalledWith('test@example.com');
  });

  it('calls onSubmit on Enter with valid email', () => {
    const onSubmit = vi.fn();
    render(<EmailInput value="test@example.com" onChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByPlaceholderText('your@email.com'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('does not call onSubmit on Enter with invalid email', () => {
    const onSubmit = vi.fn();
    render(<EmailInput value="invalid" onChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByPlaceholderText('your@email.com'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows error after blur with invalid email', () => {
    render(<EmailInput value="notanemail" onChange={() => {}} onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText('your@email.com');
    fireEvent.blur(input);
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('displays percentage', () => {
    render(<ProgressBar percent={42} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });
});

describe('Timer', () => {
  it('renders initial time', () => {
    render(<Timer />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});
