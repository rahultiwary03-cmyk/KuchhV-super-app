export function calculateSurgeMultiplier(
  activeOrdersCount: number,
  onlineRidersCount: number,
  isRaining: boolean,
): number {
  if (
    !Number.isFinite(activeOrdersCount) ||
    !Number.isFinite(onlineRidersCount) ||
    activeOrdersCount < 0 ||
    onlineRidersCount < 0
  ) {
    throw new RangeError('Order and rider counts must be non-negative numbers');
  }

  let multiplier = 1;
  const demandRatio = activeOrdersCount / (onlineRidersCount || 1);

  if (demandRatio > 1.5) multiplier += 0.3;
  if (demandRatio > 3) multiplier += 0.6;
  if (isRaining) multiplier += 0.4;

  return Number(multiplier.toFixed(2));
}
