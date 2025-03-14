'use client';

import { useSearchParams } from 'next/navigation';

export const isLocalhost = () => {
    if (typeof window !== "undefined") {
      return (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      );
    }
    return false;
};

export const useLocalLLMs = () => {
    const searchParams = useSearchParams();
    const localParam = searchParams?.get('local');

    if (typeof window === "undefined") {
        return false;
    }

    return window.location.hostname.includes("local.llmgame.ai") ||
           localParam === 'true';
}