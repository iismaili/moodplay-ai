import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CameraView } from '../../src/components/CameraView.tsx';
import { ExpressionCard } from '../../src/components/ExpressionCard.tsx';

describe('CameraView countdown and snapshot UI', () => {
  it('kamera ekranında yüz takip çizgileri yer alır, ancak yazı veya durum rozetleri barındırmaz', () => {
    const videoRef = createRef<HTMLVideoElement>();
    const { container } = render(
      <CameraView
        captureStatus="counting"
        capturedExpression={null}
        closerHint={false}
        countdown={4}
        deviceId=""
        devices={[]}
        isCountingDown={true}
        landmarks={[{ x: 0.5, y: 0.5, z: 0 }]}
        mirror={true}
        onDeviceChange={() => undefined}
        onStartCountdown={() => undefined}
        onStop={() => undefined}
        showOverlay={true}
        videoRef={videoRef}
      />,
    );

    // Video ve yüz takip kanvası mevcut olmalı
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();

    // Ancak hiçbir yazı, durum veya sayaç katmanı olmamalı
    expect(screen.queryByTestId('countdown-overlay')).toBeNull();
    expect(screen.queryByTestId('model-status')).toBeNull();
    expect(screen.queryByTestId('camera-flash')).toBeNull();
    expect(screen.queryByText(/Tek kişi izlenir/i)).toBeNull();
  });

  it('başlangıçta 5 saniyelik analiz butonunu gösterir', () => {
    const videoRef = createRef<HTMLVideoElement>();
    render(
      <CameraView
        captureStatus="idle"
        capturedExpression={null}
        closerHint={false}
        countdown={null}
        deviceId=""
        devices={[]}
        isCountingDown={false}
        mirror={true}
        onDeviceChange={() => undefined}
        onStartCountdown={() => undefined}
        onStop={() => undefined}
        videoRef={videoRef}
      />,
    );

    const button = screen.getByTestId('countdown-trigger-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/Duygumu Analiz Et/i);
  });

  it('geri sayım sırasında buton üzerinde sayacı gösterir ve butonu devre dışı bırakır', () => {
    const videoRef = createRef<HTMLVideoElement>();
    render(
      <CameraView
        captureStatus="counting"
        capturedExpression={null}
        closerHint={false}
        countdown={4}
        deviceId=""
        devices={[]}
        isCountingDown={true}
        mirror={true}
        onDeviceChange={() => undefined}
        onStartCountdown={() => undefined}
        onStop={() => undefined}
        videoRef={videoRef}
      />,
    );

    const button = screen.getByTestId('countdown-trigger-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('4');
    expect(button).toHaveTextContent(/Saniye Kaldı/i);
  });

  it('ifade yakalandığında kilitli olduğunu belirtir ve yeniden yakalama butonunu sunar', () => {
    const videoRef = createRef<HTMLVideoElement>();
    render(
      <CameraView
        captureStatus="captured"
        capturedExpression="happy"
        closerHint={false}
        countdown={null}
        deviceId=""
        devices={[]}
        isCountingDown={false}
        mirror={true}
        onDeviceChange={() => undefined}
        onStartCountdown={() => undefined}
        onStop={() => undefined}
        videoRef={videoRef}
      />,
    );

    expect(screen.getByText(/İfade kilitlendi \(Anlık değişim kapalı/i)).toBeInTheDocument();
    const button = screen.getByTestId('countdown-trigger-button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent(/Yeniden İfadeni Yakala/i);
  });

  it('butona basıldığında onStartCountdown tetiklenir', async () => {
    const user = userEvent.setup();
    const handleStart = vi.fn();
    const videoRef = createRef<HTMLVideoElement>();

    render(
      <CameraView
        captureStatus="idle"
        capturedExpression={null}
        closerHint={false}
        countdown={null}
        deviceId=""
        devices={[]}
        isCountingDown={false}
        mirror={true}
        onDeviceChange={() => undefined}
        onStartCountdown={handleStart}
        onStop={() => undefined}
        videoRef={videoRef}
      />,
    );

    await user.click(screen.getByTestId('countdown-trigger-button'));
    expect(handleStart).toHaveBeenCalledTimes(1);
  });
});

describe('ExpressionCard countdown and lock states', () => {
  it('boşta iken butona basma yönlendirmesi yapar', () => {
    render(
      <ExpressionCard
        captureStatus="idle"
        expression="unknown"
        message="Butona basın..."
        observing={true}
      />,
    );
    expect(screen.getByText(/ANALİZ BEKLENİYOR/i)).toBeInTheDocument();
    expect(screen.getByText(/5 saniye içinde kameraya ifadenizi gösterin/i)).toBeInTheDocument();
  });

  it('geri sayım sırasında sayacı gösterir', () => {
    render(
      <ExpressionCard
        captureStatus="counting"
        countdown={3}
        expression="unknown"
        message="Geri sayılıyor..."
        observing={true}
      />,
    );
    expect(screen.getByText(/GERİ SAYIM: 3sn/i)).toBeInTheDocument();
  });

  it('yakalandığında kilitli rozetini ve yakalanan ifadeyi gösterir', () => {
    render(
      <ExpressionCard
        captureStatus="captured"
        expression="happy"
        message="Yüzünde güller açıyor..."
        observing={false}
      />,
    );
    expect(screen.getByText(/GÜLÜMSEME \(KİLİTLENDİ\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Müzik Sabitlendi/i)).toBeInTheDocument();
    expect(screen.getByText('Yüzünde güller açıyor...')).toBeInTheDocument();
  });
});
