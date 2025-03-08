'use client';

import { useWebGPU } from '../contexts/WebGPUContext';

export default function WebGPUStatus() {
  const { isSupported } = useWebGPU();

  if (isSupported === null) {
    return <div className="text-center">Checking WebGPU support...</div>;
  }

  return (
    <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.145] text-center">
      <p>
        WebGPU is{' '}
        <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
          {isSupported ? 'supported' : 'not supported'}
        </span>{' '}
        in your browser
        {!isSupported && (
          <>
            <br />
            <a 
              href="https://docs.swmansion.com/TypeGPU/blog/troubleshooting/"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Enable WebGPU in your browser
            </a>
          </>
        )}
      </p>
    </div>
  );
} 