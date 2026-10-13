import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App.tsx';
import { SettingsPanel } from '../../src/components/SettingsPanel.tsx';
import { WelcomeScreen } from '../../src/components/WelcomeScreen.tsx';
import { SETTINGS_STORAGE_KEY } from '../../src/config/runtimeSettings.ts';
import { useRuntimeSettings } from '../../src/hooks/useRuntimeSettings.ts';

class FakeAudioElement {
  src = '';
  loop = false;
  paused = true;
  currentTime = 0;
  volume = 1;
  preload = 'auto';
  onerror: (() => void) | null = null;
  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  load(): void {}
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('Audio', FakeAudioElement);
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    writable: true,
    value: null,
  });
  HTMLMediaElement.prototype.play = () => Promise.resolve();
});

describe('welcome and settings screens', () => {
  it('başlangıçta kamerayı açmaz ve Türkçe uyarıları gösterir', async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
    });
    const user = userEvent.setup();
    render(<WelcomeScreen onStart={() => undefined} stopped={false} />);
    expect(screen.getByRole('heading', { name: 'Yüz ifaden müziğini seçsin' })).toBeTruthy();
    expect(screen.getByText(/Görüntü kaydedilmez/)).toBeTruthy();
    expect(screen.getByText(/duygu teşhisi değildir/i)).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('start-button'));
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('uygulama düğmeden önce kamera istemez, reddi Türkçe gösterir', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
    });
    const user = userEvent.setup();
    render(<App />);
    expect(getUserMedia).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('start-button'));
    expect(await screen.findByTestId('error-banner')).toHaveTextContent(/izni verilmedi/i);
    expect(getUserMedia).toHaveBeenCalled();
    for (const call of getUserMedia.mock.calls) {
      expect((call[0] as MediaStreamConstraints).audio).toBe(false);
    }
    expect(screen.queryByTestId('debug-panel')).toBeNull();
  });

  it('panelden değişen mesaj yenileme sonrası okunabilecek şekilde saklanır', async () => {
    const user = userEvent.setup();
    function Harness() {
      const api = useRuntimeSettings();
      return (
        <SettingsPanel
          notice={api.notice}
          onChange={api.update}
          onClose={() => undefined}
          onNotice={api.setNotice}
          onPreview={api.setPreview}
          onReplace={api.setSettings}
          onReset={api.resetDefaults}
          onTestMusic={() => undefined}
          settings={api.settings}
        />
      );
    }
    render(<Harness />);
    const field = screen.getByTestId('messages-happy');
    await user.clear(field);
    await user.type(field, 'Sahne sana gülümsüyor');
    await waitFor(() => {
      expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('Sahne sana gülümsüyor');
    });
  });
});
