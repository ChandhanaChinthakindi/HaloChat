export function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function splitIntoMessages(text: string): string[] {
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const parts: string[] = [];

  for (const line of lines) {
    if (line.length <= 100) {
      parts.push(line);
      continue;
    }
    const segments = line.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [line];
    let current = "";
    for (const seg of segments) {
      const s = seg.trim();
      if (!s) continue;
      if (current && current.length + 1 + s.length > 100) {
        parts.push(current);
        current = s;
      } else {
        current = current ? `${current} ${s}` : s;
      }
    }
    if (current) parts.push(current);
  }

  return parts.filter(Boolean);
}

export function detectMood(text: string): string {
  const t = text.toLowerCase();
  if (/haha|lol|lmao|hehe|😂|😄|😆|jk |kidding|joke/.test(t)) return "😄";
  if (/sorry|that's tough|sounds hard|i hear you|must be hard|difficult|exhausting|struggling/.test(t)) return "🥺";
  if (/wait really|interesting|fascinating|tell me more|i wonder|actually|curious|oh wow/.test(t)) return "🤔";
  if (/love|so happy|amazing|wonderful|excited|can't wait|proud|incredible|yay/.test(t)) return "🥰";
  if (/think|honestly|perspective|consider|believe|actually|maybe|feel like/.test(t)) return "💭";
  return "🌿";
}

export function formatLastSeen(timestamp?: number): string {
  if (!timestamp) return "active recently";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "active now";
  if (mins < 60) return `active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `active ${hrs}h ago`;
  if (hrs < 48) return "active yesterday";
  return `active ${Math.floor(hrs / 24)}d ago`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}
