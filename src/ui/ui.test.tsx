import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, Chip, Field, Modal, ProgressBar } from './index';

describe('Button', () => {
  it('calls onClick and can be disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  it('accepts every variant', () => {
    render(
      <>
        <Button variant="primary" fullWidth onClick={() => undefined}>
          A
        </Button>
        <Button variant="secondary" onClick={() => undefined}>
          B
        </Button>
        <Button variant="text" onClick={() => undefined}>
          C
        </Button>
      </>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});

describe('Chip', () => {
  it('is a real radio or checkbox with the label as its name', () => {
    render(
      <>
        <Chip
          kind="radio"
          name="g"
          value="a"
          label="Radio"
          selected={false}
          onChange={() => undefined}
        />
        <Chip
          kind="checkbox"
          name="h"
          value="b"
          label="Check"
          description="More"
          selected
          onChange={() => undefined}
        />
      </>,
    );
    expect(screen.getByRole('radio', { name: 'Radio' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Check/ })).toBeChecked();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('calls onChange when tapped', () => {
    const onChange = vi.fn();
    render(
      <Chip kind="checkbox" name="g" value="a" label="Tap" selected={false} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tap' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Field', () => {
  function Controlled({ max = 10 }: { max?: number }) {
    const [value, setValue] = useState('');
    return <Field label="Note" value={value} onChange={setValue} maxLength={max} />;
  }

  it('has a label, a counter and a length limit', () => {
    render(<Controlled />);
    const box = screen.getByRole('textbox', { name: 'Note' });
    expect(box).toHaveAttribute('maxlength', '10');
    fireEvent.change(box, { target: { value: 'abc' } });
    expect(box).toHaveValue('abc');
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('scrolls itself to the middle of the screen on focus (the keyboard must not cover it)', () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    render(<Controlled />);
    fireEvent.focus(screen.getByRole('textbox', { name: 'Note' }));
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  });

  it('does not fail where scrollIntoView does not exist', () => {
    render(<Controlled />);
    expect(() => fireEvent.focus(screen.getByRole('textbox', { name: 'Note' }))).not.toThrow();
  });
});

describe('ProgressBar', () => {
  it('is an accessible progress bar with a readable value', () => {
    render(<ProgressBar value={3} max={12} label="Progress" valueText="3 of 12" />);
    const bar = screen.getByRole('progressbar', { name: 'Progress' });
    expect(bar).toHaveAttribute('value', '3');
    expect(bar).toHaveAttribute('max', '12');
    expect(bar).toHaveAttribute('aria-valuetext', '3 of 12');
  });
});

describe('Modal', () => {
  function Opener({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        {open ? (
          <Modal
            title="Title"
            onClose={() => {
              onClose();
              setOpen(false);
            }}
            actions={
              <>
                <button type="button">First</button>
                <button type="button">Last</button>
              </>
            }
          >
            <p>Body</p>
          </Modal>
        ) : null}
      </>
    );
  }

  it('is a labelled modal dialog and moves focus to its first button', () => {
    render(<Opener onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'Title' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('Escape asks to close and focus goes back to the opener', () => {
    const onClose = vi.fn();
    render(<Opener onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Tab stays inside the dialog (wraps from the last button to the first and back)', () => {
    render(<Opener onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('ignores other keys', () => {
    const onClose = vi.fn();
    render(<Opener onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
