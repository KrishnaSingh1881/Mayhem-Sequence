"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/invites/validate?token=${params.token}`);
        const data = await res.json();
        if (data.error) setError(data.error);
        else setInvite(data.invite);
      } catch (err) {
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [params.token]);

  const handleJoin = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: params.token })
      });
      const data = await res.json();
      
      if (data.error) {
         if (res.status === 401) {
            // Store target in session/localstorage and redirect to login
            localStorage.setItem("join_redirect", params.token);
            router.push(`/login?redirect=/invite/${params.token}`);
         } else {
            alert(data.error);
         }
      } else {
        router.push(`/project/${data.projectId}`);
      }
    } catch (err) {
      alert("Failed to join project");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="font-syne text-2xl font-black uppercase italic animate-pulse">Initializing Invite...</div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] p-4 text-center">
      <h1 className="text-6xl font-black uppercase tracking-tighter mb-4 text-[var(--coral)]">Invite Error</h1>
      <p className="max-w-md font-bold text-slate-500 mb-8">{error}</p>
      <Button variant="dark" onClick={() => router.push("/")}>Return Home</Button>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
       <div className="max-w-md w-full rounded-2xl border-4 border-black bg-white p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] text-center space-y-8">
          <div>
            <div className="mb-2 inline-block rounded-full bg-[var(--yellow)] px-4 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black">
               Official Invitation
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
              Join <span className="text-[var(--blue)]">{invite?.project_name}</span>
            </h1>
          </div>

          <p className="font-bold text-slate-600">
            You've been invited to join the <span className="uppercase text-black underline italic decoration-2">{invite?.role}</span> team.
          </p>

          <div className="space-y-4">
            <Button 
               className="w-full py-6 text-xl" 
               variant="primary" 
               onClick={handleJoin}
               disabled={accepting}
            >
              {accepting ? "Joining..." : "Accept Invitation"}
            </Button>
            <p className="text-[10px] font-bold text-slate-400 uppercase">
               By joining, you will gain access to builds, issues, and private project logs.
            </p>
          </div>
       </div>
    </div>
  );
}
