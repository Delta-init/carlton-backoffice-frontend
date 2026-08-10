import { useCallback, useEffect, useRef, useState } from 'react';

// Per-conversation message drafts, WhatsApp style: whatever you have typed stays
// put when you switch away and comes back when you return. A draft is cleared on
// exactly two events - a successful send, or you emptying the box yourself.
// Switching chats, closing the thread panel, navigating away and reloading all
// preserve it.
//
// Keys are namespaced by conversation: "channel:<channel_id>", "dm:<user_id>",
// "thread:<msg_id>", so each composer has its own independent draft.
const PREFIX = 'carlton_draft_';
const DEBOUNCE_MS = 300;

// Attachments are deliberately NOT persisted - picked files are File objects that
// cannot be serialised, and a half-restored draft (text back, files silently gone)
// is worse than not restoring them at all.

const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

const storageKey = (key) => PREFIX + key;

export function readDraft(key) {
  if (!key) return { text: '', mentions: [] };
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return { text: '', mentions: [] };
    const parsed = JSON.parse(raw);
    return { text: parsed.text || '', mentions: parsed.mentions || [] };
  } catch {
    return { text: '', mentions: [] };
  }
}

function writeDraft(key, text, mentions) {
  if (!key) return;
  try {
    // An empty box removes the entry rather than storing "" - that is the
    // "backspaced it all away" case, and it keeps the index free of blanks.
    if (!text.trim()) localStorage.removeItem(storageKey(key));
    else localStorage.setItem(storageKey(key), JSON.stringify({ text, mentions, at: Date.now() }));
  } catch {
    // Quota or private-mode failures must never break typing
  }
  notify();
}

function readAllDraftKeys() {
  const keys = new Set();
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.add(k.slice(PREFIX.length));
    }
  } catch { /* ignore */ }
  return keys;
}

// Set of conversation keys that currently hold a draft, for the sidebar indicator.
// Re-reads whenever a draft is written here or in another tab.
export function useDraftKeys() {
  const [keys, setKeys] = useState(readAllDraftKeys);
  useEffect(() => {
    const update = () => setKeys(readAllDraftKeys());
    listeners.add(update);
    window.addEventListener('storage', update);
    return () => { listeners.delete(update); window.removeEventListener('storage', update); };
  }, []);
  return keys;
}

/**
 * Draft-backed composer text for one conversation.
 * Pass a null/empty key when nothing is selected - the hook then no-ops.
 */
export function useDraft(key) {
  const [text, setText] = useState(() => readDraft(key).text);
  const mentionsRef = useRef(readDraft(key).mentions);
  const timerRef = useRef(null);
  const keyRef = useRef(key);
  const textRef = useRef(text);

  const flush = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    writeDraft(keyRef.current, textRef.current, mentionsRef.current);
  }, []);

  // Switching conversations: persist what was typed under the OLD key before
  // loading the new one, otherwise a switch inside the debounce window loses it.
  useEffect(() => {
    if (keyRef.current !== key) {
      flush();
      keyRef.current = key;
      const stored = readDraft(key);
      textRef.current = stored.text;
      mentionsRef.current = stored.mentions;
      setText(stored.text);
    }
  }, [key, flush]);

  // Same reason, for unmount (closing the thread panel, leaving the page).
  useEffect(() => flush, [flush]);

  const update = useCallback((next) => {
    textRef.current = next;
    setText(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      writeDraft(keyRef.current, textRef.current, mentionsRef.current);
    }, DEBOUNCE_MS);
  }, []);

  // Called on a successful send. Skips the debounce so the entry is gone at once.
  const clearDraft = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    textRef.current = '';
    mentionsRef.current = [];
    setText('');
    writeDraft(keyRef.current, '', []);
  }, []);

  // Mentions ride along with the text: restoring "@Sara" without her user_id would
  // send as plain text and silently fail to notify her.
  const setMentions = useCallback((list) => {
    mentionsRef.current = list || [];
  }, []);

  const getMentions = useCallback(() => mentionsRef.current, []);

  return { text, setText: update, clearDraft, setMentions, getMentions };
}
