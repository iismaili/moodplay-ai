import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

HTMLCanvasElement.prototype.getContext = (() =>
  ({
    clearRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    fillStyle: '',
  }) as unknown) as typeof HTMLCanvasElement.prototype.getContext;
