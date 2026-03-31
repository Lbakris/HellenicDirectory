"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../../lib/api-client";
import Link from "next/link";

export default function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [activeThread, setActiveThread] = useState<string | null>(null);

  const { data: threadsData } = useQuery({
    queryKey: ["threads", id],
    queryFn: () => api.get<{ data: any[] }>(`/directories/${id}/messages`),
  });

  const { data: threadData } = useQuery({
    queryKey: ["thread", id, activeThread],
    queryFn: () => api.get<{ thread: any }>(`/directories/${id}/messages/${activeThread}`),
    enabled: !!activeThread,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      api.post(`/directories/${id}/messages`, { threadId: activeThread, body }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["thread", id, activeThread] });
    },
  });

  const threads = threadsData?.data ?? [];
  const thread = threadData?.thread;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href={`/directories/${id}`} className="text-gold/80 hover:text-gold text-sm mb-6 inline-block">← Directory</Link>
      <h1 className="font-serif text-3xl text-navy mb-6">Inbox</h1>

      <div className="grid sm:grid-cols-3 gap-6 h-[600px]">
        {/* Thread list */}
        <div className="border border-border rounded-lg overflow-y-auto">
          {threads.length === 0 && (
            <p className="text-muted-foreground text-sm p-4">No messages yet.</p>
          )}
          {threads.map((t: any) => (
            <button key={t.id} onClick={() => setActiveThread(t.id)}
              className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors ${activeThread === t.id ? "bg-muted" : ""}`}>
              <p className="text-sm font-medium text-navy line-clamp-1">{t.subject ?? "No subject"}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {t.messages[0]?.body ?? ""}
              </p>
            </button>
          ))}
        </div>

        {/* Message view */}
        <div className="sm:col-span-2 border border-border rounded-lg flex flex-col">
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread?.messages.map((msg: any) => (
                  <div key={msg.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy shrink-0">
                      {msg.sender.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {msg.sender.fullName} · {new Date(msg.sentAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type a message..."
                  rows={2}
                  className="flex-1 border border-input rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => sendMutation.mutate(body)}
                  disabled={!body.trim() || sendMutation.isPending}
                  className="bg-gold text-navy px-4 py-2 rounded text-sm font-medium hover:bg-gold-400 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
