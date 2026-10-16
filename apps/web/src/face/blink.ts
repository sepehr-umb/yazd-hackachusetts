export type BlinkConfig = {
  random?: () => number;
  minInterval?: number;
  maxInterval?: number;
  duration?: number;
};

export type BlinkScheduler = { update(dt: number): number };

export function createBlinkScheduler({
  random = Math.random,
  minInterval = 2,
  maxInterval = 6,
  duration = 0.16,
}: BlinkConfig = {}): BlinkScheduler {
  const nextInterval = () => minInterval + random() * (maxInterval - minInterval);
  let untilBlink = nextInterval();
  let blinkTime = 0;
  let blinking = false;

  return {
    update(dt) {
      if (blinking) {
        blinkTime += dt;
      } else {
        untilBlink -= dt;
        if (untilBlink > 0) return 0;
        blinking = true;
        blinkTime = -untilBlink;
      }
      return Math.sin((Math.PI * blinkTime) / duration);
    },
  };
}
