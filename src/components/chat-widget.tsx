"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages([...next, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <Card className="flex h-[480px] w-[360px] flex-col shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🤖 Support Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
              {messages.length === 0 && (
                <p className="text-muted-foreground">
                  Ask about Japanese forms, visas, or ward office procedures.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                      : "rounded-lg bg-muted px-3 py-2"
                  }
                >
                  {m.content}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask a question…"
              />
              <Button size="sm" onClick={send} disabled={loading}>
                {loading ? "…" : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Button size="lg" className="rounded-full h-12 w-12 p-0 text-xl" onClick={() => setOpen(!open)}>
        {open ? "✕" : "💬"}
      </Button>
    </div>
  );
}
