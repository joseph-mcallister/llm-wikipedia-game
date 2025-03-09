'use client';

import { useWebGPU } from '../contexts/WebGPUContext';

export default function WebGPUStatus() {
  const { isSupported } = useWebGPU();
  if (isSupported === null) {
    return <div className="text-center">Checking WebGPU support...</div>;
  }

  return (
    <div className="text-center">
      <p>
        WebGPU is{' '}
        <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
          {isSupported ? 'supported' : 'not supported'}
        </span>{' '}
        in your browser
        {!isSupported && (
          <>
            <br />
            For a faster experience, follow{' '}
            <a 
              href="https://docs.swmansion.com/TypeGPU/blog/troubleshooting/"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              this guide{' '}
            </a>
          </>
        )}
      </p>
    </div>
  );
} 