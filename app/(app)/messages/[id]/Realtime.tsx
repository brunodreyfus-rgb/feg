"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Rafraîchit la conversation dès qu'un nouveau message arrive, et garde le fil en bas. */
export default function Realtime({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const el = document.getElementById("thread");
    if (el) el.scrollTop = el.scrollHeight;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  return null;
}
