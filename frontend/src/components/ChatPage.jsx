import { useEffect, useRef, useState } from "react";
import { useChat } from "../useChat";

const SUGGESTIONS = [
  "What is the current cyclone status?",
  "What is the cyclone risk in Odisha?",
  "What is the risk in Chennai for the next 24 hours?",
  "What factors contributed to the risk score?",
];

const time = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const EASE = "ease-[cubic-bezier(0.2,0,0,1)]";
const iconBase = `absolute inset-0 m-auto size-5 transition-[opacity,transform,scale,filter] duration-300 ${EASE}`;
const iconOn = "opacity-100 scale-100 blur-0";
const iconOff = "opacity-0 scale-[0.25] blur-[4px]";

function AssistantAvatar() {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" />
      </svg>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`msg-in flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <AssistantAvatar />}
      <div className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-white"
              : `px-0.5 py-1 ${msg.error ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"}`
          }
        >
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-pretty">
            {msg.content}
          </p>
        </div>
        <span className="px-1 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">{time(msg.createdAt)}</span>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="msg-in flex items-center gap-3" role="status" aria-label="Assistant is typing">
      <AssistantAvatar />
      <div className="flex gap-1 px-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="dot size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatPage({
  endpoint,
  assistantName = import.meta.env.VITE_GEMINI_ASSISTANT_NAME || "StormSense Assistant"
}) {
  const { messages, isLoading, send, stop } = useChat({ ...(endpoint ? { endpoint } : {}) });
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const resize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const submit = (text = draft) => {
    if (!text.trim() || isLoading) return;
    send(text);
    setDraft("");
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = draft.trim().length > 0;

  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
      <style>{`
        @keyframes msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes dot { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        .msg-in { animation: msg-in 300ms cubic-bezier(0.2, 0, 0, 1) both; }
        .dot { animation: dot 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .msg-in, .dot { animation: none; } }
      `}</style>

      {/* Header: shadow instead of a hard border */}
      <header className="flex items-center gap-3 px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
        <AssistantAvatar />
        <div className="leading-tight">
          <h1 className="text-sm font-semibold">{assistantName}</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{isLoading ? "Typing…" : "Ready to help"}</p>
        </div>
      </header>

      {/* Conversation */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6">
          {messages.length === 0 ? (
            <div className="my-auto flex flex-col items-center gap-6 text-center">
              <h2 className="text-2xl font-semibold text-balance">What can I help you with?</h2>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="min-h-10 rounded-full px-4 text-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)] transition-[background-color,transform] duration-150 hover:bg-neutral-100 active:scale-[0.96] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] dark:hover:bg-neutral-900"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6" role="log" aria-live="polite">
              {messages.map((m) => (
                <Message key={m.id} msg={m} />
              ))}
              {isLoading && <Typing />}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Composer: outer 24px = inner 16px + 8px padding */}
      <footer className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-shadow duration-200 focus-within:shadow-[0_0_0_2px_rgba(37,99,235,0.7),0_8px_24px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.4)] dark:focus-within:shadow-[0_0_0_2px_rgba(96,165,250,0.8),0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              resize();
            }}
            onKeyDown={onKeyDown}
            placeholder="Message the assistant…"
            aria-label="Message"
            className="max-h-50 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-6 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          />
          <button
            type="button"
            onClick={() => (isLoading ? stop() : submit())}
            disabled={!isLoading && !canSend}
            aria-label={isLoading ? "Stop generating" : "Send message"}
            className={`relative size-10 shrink-0 rounded-2xl transition-[background-color,transform,opacity] duration-150 active:scale-[0.96] disabled:active:scale-100 ${isLoading || canSend
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
              }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${iconBase} ${isLoading ? iconOff : iconOn}`} aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <svg viewBox="0 0 24 24" fill="currentColor" className={`${iconBase} ${isLoading ? iconOn : iconOff}`} aria-hidden="true">
              <rect x="7" y="7" width="10" height="10" rx="2" />
            </svg>
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-neutral-500 dark:text-neutral-400">
          Enter to send, Shift+Enter for a new line
        </p>
      </footer>
    </div>
  );
}
