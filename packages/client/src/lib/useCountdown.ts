import { computed, onUnmounted, ref, watch, type Ref } from 'vue';

/**
 * Seconds remaining until an epoch-ms deadline (server-authoritative
 * `phaseEndsAt`). Returns null when there is no active deadline.
 */
export function useCountdown(endsAt: Ref<number | null | undefined>) {
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  watch(
    endsAt,
    (value) => {
      stop();
      if (value) {
        now.value = Date.now();
        timer = setInterval(() => {
          now.value = Date.now();
        }, 250);
      }
    },
    { immediate: true },
  );

  onUnmounted(stop);

  const seconds = computed(() => {
    const value = endsAt.value;
    if (!value) return null;
    return Math.max(0, Math.ceil((value - now.value) / 1000));
  });

  return { seconds };
}
