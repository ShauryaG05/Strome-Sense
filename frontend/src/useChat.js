import { useCallback, useRef, useState } from "react";

/**
 * Owns chat state and talks to YOUR backend.
 * Expected contract:  POST {endpoint}  body: { messages: [{role, content}] }
 *                     response:        { reply: "text from the AI model" }
 */
const DEFAULT_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL || '/api'}/chat`;

export function useChat({ endpoint = DEFAULT_ENDPOINT } = {}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);

  const send = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || isLoading) return;

      const userMsg = { id: crypto.randomUUID(), role: "user", content, createdAt: Date.now() };
      const history = [...messages, userMsg];
      setMessages(history);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", content: data.reply, createdAt: Date.now() },
        ]);
      } catch (err) {
        if (err.name === "AbortError") return;
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "That didn't go through. Check your connection and send it again.",
            createdAt: Date.now(),
            error: true,
          },
        ]);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [endpoint, messages, isLoading]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, isLoading, send, stop };
}
