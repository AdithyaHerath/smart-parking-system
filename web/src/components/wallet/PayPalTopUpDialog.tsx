import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { WALLET_MAX } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from 'lucide-react';

const PAYPAL_CLIENT_ID = 'AfLHnZEPzHrN0dWd4UK7TIhzZNA11UYniOlj31VmJfoEmVf7biUfn96ZMu8LDUwA85s2YfUXirorjM6i';

const PRESET_AMOUNTS = [300, 500, 1000, 1500];

// Approximate LKR to USD conversion rate
const LKR_TO_USD = 0.0033;

interface PayPalTopUpDialogProps {
  currentBalance: number;
  onSuccess: (newBalance: number) => void;
}

export default function PayPalTopUpDialog({ currentBalance, onSuccess }: PayPalTopUpDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const amountNum = parseInt(amount) || 0;
  const maxTopUp = WALLET_MAX - currentBalance;
  const isValidAmount = amountNum > 0 && amountNum <= maxTopUp;
  const usdAmount = (amountNum * LKR_TO_USD).toFixed(2);

  const handleApprove = async (_data: any, actions: any) => {
    setProcessing(true);
    try {
      // Capture payment on client side
      const details = await actions.order.capture();

      if (details.status !== 'COMPLETED') {
        throw new Error('Payment was not completed');
      }

      // Verify payment server-side and update wallet via edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const response = await supabase.functions.invoke('verify-paypal', {
        body: { orderId: details.id, amountLKR: amountNum },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Server verification failed');
      }

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error || 'Payment verification failed');
      }

      toast({
        title: 'Top-up Successful!',
        description: `LKR ${amountNum} has been added to your wallet. New balance: LKR ${result.newBalance}`,
      });

      onSuccess(result.newBalance);
      setAmount('');
      setOpen(false);
    } catch (err: any) {
      toast({
        title: 'Payment Error',
        description: err.message || 'Something went wrong during payment.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <CreditCard className="h-4 w-4" />
          Top-up via PayPal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Top-up via PayPal</DialogTitle>
          <DialogDescription>
            Select an amount to add to your wallet. You'll be redirected to PayPal to complete the payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current balance info */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Balance</span>
              <span className="font-medium">LKR {currentBalance}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Maximum Top-up</span>
              <span className="font-medium">LKR {maxTopUp > 0 ? maxTopUp : 0}</span>
            </div>
          </div>

          {/* Preset amount buttons */}
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS.filter(a => a <= maxTopUp).map(preset => (
              <Button
                key={preset}
                size="sm"
                variant={amountNum === preset ? 'default' : 'outline'}
                onClick={() => setAmount(String(preset))}
                className="text-xs"
              >
                LKR {preset}
              </Button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="space-y-2">
            <Label>Custom Amount (LKR)</Label>
            <Input
              type="number"
              min="1"
              max={maxTopUp}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Enter amount (max ${maxTopUp})`}
            />
            {isValidAmount && (
              <p className="text-xs text-muted-foreground">
                ≈ USD {usdAmount} will be charged via PayPal
              </p>
            )}
          </div>

          {/* PayPal Buttons */}
          {isValidAmount && (
            <PayPalScriptProvider
              options={{
                clientId: PAYPAL_CLIENT_ID,
                currency: 'USD',
              }}
            >
              <PayPalButtons
                disabled={processing}
                style={{ layout: 'vertical', shape: 'rect', label: 'paypal' }}
                createOrder={(_data, actions) => {
                  return actions.order.create({
                    intent: 'CAPTURE',
                    purchase_units: [
                      {
                        amount: {
                          currency_code: 'USD',
                          value: usdAmount,
                        },
                        description: `NPark Wallet Top-up: LKR ${amountNum}`,
                      },
                    ],
                  });
                }}
                onApprove={handleApprove}
                onError={(err) => {
                  toast({
                    title: 'PayPal Error',
                    description: 'An error occurred with PayPal. Please try again.',
                    variant: 'destructive',
                  });
                  console.error('PayPal error:', err);
                }}
                onCancel={() => {
                  toast({
                    title: 'Payment Cancelled',
                    description: 'You cancelled the PayPal payment.',
                  });
                }}
              />
            </PayPalScriptProvider>
          )}


          {maxTopUp <= 0 && (
            <p className="text-sm text-destructive text-center">
              Your wallet is at maximum capacity (LKR {WALLET_MAX}).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
