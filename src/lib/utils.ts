export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return then.toLocaleDateString();
}

export function calculateSimilarity(t1: string, t2: string): number {
  const words1 = t1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = t2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let shared = 0;
  for (const w of set1) {
    if (set2.has(w)) shared++;
  }

  return shared / Math.max(set1.size, set2.size);
}
