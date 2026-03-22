import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`;

function parseActions(text: string): { intent: string; [key: string]: any } | null {
  const match = text.match(/```action\s*\n?([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function stripActionBlocks(text: string): string {
  return text.replace(/```action\s*\n?[\s\S]*?```/g, '').trim();
}

export default function ParkAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleAction = useCallback(async (action: { intent: string; [key: string]: any }) => {
    switch (action.intent) {
      case 'check_balance': {
        if (!user) break;
        const { data } = await supabase.from('wallets').select('balance_lkr').eq('user_id', user.id).single();
        if (data) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Your current wallet balance is **LKR ${data.balance_lkr}**.` }]);
        }
        break;
      }
      case 'view_bookings': {
        navigate('/bookings');
        toast({ title: 'Navigating to My Bookings' });
        break;
      }
      case 'book_slot': {
        if (!user) {
          toast({ title: 'You must be logged in to book a slot', variant: 'destructive' });
          break;
        }

        const vType = action.vehicle_type;
        // 1. Verify we have BOTH pieces of data from the AI
        if (!vType || !action.arrival_time) {
          setMessages(prev => [...prev, { role: 'assistant', content: "I need both the vehicle type (car/motorbike) and your exact arrival date and time to book the slot!" }]);
          break;
        }

        const fee = vType === 'car' ? 100 : 50;
        
        // 2. The SQA Rule Check (1 hour to 24 hours)
        const arrivalDate = new Date(action.arrival_time);
        const now = new Date();
        const diffHours = (arrivalDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffHours < 1) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, you must book at least 1 hour in advance! Your requested time (${arrivalDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}) is too soon.` }]);
          break;
        }
        if (diffHours > 24) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, you can only book a maximum of 24 hours in advance." }]);
          break;
        }

        // 3. Find an available slot
        const { data: slot } = await supabase
          .from('parking_slots')
          .select('id, slot_code')
          .eq('type', vType)
          .eq('status', 'free')
          .limit(1)
          .maybeSingle();

        if (!slot) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, the lot is full! There are no free ${vType} slots available for that time.` }]);
          break;
        }

        // 4. Check wallet balance (ensure they have enough to cover it LATER)
        const { data: wallet } = await supabase.from('wallets').select('balance_lkr').eq('user_id', user.id).maybeSingle();
        if (!wallet || wallet.balance_lkr < fee) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Insufficient funds to guarantee this booking. You need at least LKR ${fee} in your wallet to reserve a ${vType} spot.` }]);
          break;
        }

        // 5. Create the booking (DO NOT DEDUCT MONEY HERE)
        const { error: bookingError } = await supabase.from('bookings').insert({
          user_id: user.id,
          slot_id: slot.id,
          booking_time: arrivalDate.toISOString(),
          fee_lkr: fee,
          status: 'confirmed',
          is_walkin: false
        }).select().single();

        if (bookingError) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Database error: ${bookingError.message}` }]);
          break;
        }

        // Format the time beautifully for the user
        const timeString = arrivalDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        setMessages(prev => [...prev, { role: 'assistant', content: `Success! I have reserved slot **${slot.slot_code}** for your ${vType} on **${timeString}**.\n\nThe LKR ${fee} fee will be deducted when you arrive at the gate. Please note: a LKR 50 penalty applies if you don't arrive within 2 hours of your booked time.` }]);
        break;
      }
      case 'view_vehicles': {
        navigate('/profile');
        toast({ title: 'Navigating to Profile (Vehicles)' });
        break;
      }
      case 'navigate': {
        if (action.path) {
          navigate(action.path);
          toast({ title: `Navigating to ${action.path}` });
        }
        break;
      }
      case 'report_violation': {
        navigate('/complaints');
        toast({ title: 'Navigating to Complaints to file a report' });
        break;
      }
    }
  }, [user, navigate, toast]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          role: role || 'student',
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI service error' }));
        throw new Error(err.error || 'Failed to get response');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length > allMessages.length) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Check for actions in the final response
      const action = parseActions(assistantSoFar);
      if (action) {
        // Update the message to remove action block
        const cleanContent = stripActionBlocks(assistantSoFar);
        if (cleanContent) {
          setMessages(prev =>
            prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanContent } : m)
          );
        }
        await handleAction(action);
      }
    } catch (e: any) {
      toast({ title: 'ParkAI Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = role === 'student'
    ? ['Check my balance', 'Book a slot', 'My bookings']
    : role === 'security'
    ? ['Search a vehicle', 'Walk-in booking']
    : role === 'super_admin'
    ? ['View reports', 'Manage users']
    : ['Help'];

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
          aria-label="Open ParkAI"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-h-[560px] flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 bg-primary px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-sm font-bold text-primary-foreground">ParkAI Assistant</h3>
              <p className="text-[11px] text-primary-foreground/70">N Park • Powered by Gemini</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[380px]">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Bot className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">Hi! I'm ParkAI </p>
                <p className="text-xs text-muted-foreground mt-1">How can I help you today?</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {quickActions.map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="text-xs px-3 py-1.5 rounded-full border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                )}>
                  {msg.content.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask ParkAI..."
                className="flex-1 rounded-xl border bg-background px-3.5 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="h-9 w-9 rounded-xl" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}