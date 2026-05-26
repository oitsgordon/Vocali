import type {
  FillerBreakdownItem,
  RepetitionBreakdownItem,
  SpeakingMetrics,
} from "@/lib/types";

function formatItem({ phrase, count }: { phrase: string; count: number }) {
  return `"${phrase}" x${count}`;
}

function formatItems(
  items: Array<FillerBreakdownItem | RepetitionBreakdownItem> | undefined,
  limit: number,
) {
  const visibleItems = items?.filter((item) => item.count > 0).slice(0, limit);

  if (!visibleItems || visibleItems.length === 0) {
    return null;
  }

  return visibleItems.map(formatItem).join(", ");
}

export function getFillerBreakdownText(metrics?: SpeakingMetrics) {
  const breakdown = formatItems(metrics?.fillerBreakdown, 3);

  return breakdown ? `Noticed: ${breakdown}` : null;
}

export function getRepetitionBreakdownText(metrics?: SpeakingMetrics) {
  const breakdown = formatItems(metrics?.repetitionBreakdown, 2);

  return breakdown ? `Pattern: ${breakdown}` : null;
}
