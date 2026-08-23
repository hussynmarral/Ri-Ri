// Watches the current schedule block and triggers the AutoAdvancePrompt
// when the block's scheduled end time arrives.
import { useCallback, useEffect, useRef, useState } from 'react';

import { useScheduleStore } from '@/stores/scheduleStore';
import { useAuthStore } from '@/stores/authStore';
import { todayDateISO } from '@/lib/scheduler/engine';

export function useAutoAdvance() {
  const currentBlock = useScheduleStore((s) => s.currentBlock);
  const completeBlock = useScheduleStore((s) => s.completeBlock);
  const skipBlock     = useScheduleStore((s) => s.skipBlock);
  const load          = useScheduleStore((s) => s.load);
  const user          = useAuthStore((s) => s.user);

  const [promptVisible, setVisible] = useState(false);
  const [blockTitle, setTitle] = useState('');
  const promptedIdRef = useRef<string | null>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPrompt = useCallback((title: string) => {
    setTitle(title);
    setVisible(true);
  }, []);

  const hideAndAdvance = useCallback(() => {
    setVisible(false);
    if (user) {
      const date = todayDateISO();
      // small delay so animation can finish
      setTimeout(() => load(user.id, date), 400);
    }
  }, [user, load]);

  const onDone = useCallback(async () => {
    if (promptedIdRef.current) {
      await completeBlock(promptedIdRef.current);
    }
    hideAndAdvance();
  }, [completeBlock, hideAndAdvance]);

  const onMissed = useCallback(async () => {
    if (promptedIdRef.current) {
      await skipBlock(promptedIdRef.current);
    }
    hideAndAdvance();
  }, [skipBlock, hideAndAdvance]);

  const onAuto = useCallback(async () => {
    // Auto-advance: mark complete without user input
    if (promptedIdRef.current) {
      await completeBlock(promptedIdRef.current);
    }
    hideAndAdvance();
  }, [completeBlock, hideAndAdvance]);

  useEffect(() => {
    if (!currentBlock) return;
    if (promptedIdRef.current === currentBlock.id) return;
    if (currentBlock.status === 'completed' || currentBlock.status === 'skipped') return;

    const endTime = new Date(currentBlock.scheduledEnd).getTime();
    const msLeft  = endTime - Date.now();

    if (msLeft <= 0) return; // already past

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      promptedIdRef.current = currentBlock.id;
      showPrompt(currentBlock.title);
    }, msLeft);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentBlock?.id, currentBlock?.scheduledEnd]);

  return { promptVisible, blockTitle, onDone, onMissed, onAuto };
}
