// src/routes/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getStoredUsers, setActiveSession } from '@/lib/aurora-id';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export const Route = createFileRoute('/')({
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = getStoredUsers();
    const user = users.find(
      (u) => u.userId.toUpperCase() === userId.trim().toUpperCase() && u.pin === pin
    );

    if (user) {
      setActiveSession(user);
      navigate({ to: '/dashboard' });
    } else {
      setError('User ID atau PIN 6 digit salah!');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Aurora User Connect</CardTitle>
          <p className="text-sm text-slate-400">Masukan User ID & PIN 6-Digit Anda</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="rounded bg-red-500/10 p-2 text-center text-sm text-red-400">{error}</div>}
            <div>
              <label className="mb-1 block text-sm font-medium">User ID</label>
              <Input
                placeholder="Contoh: AUROR61710"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="border-slate-700 bg-slate-900 uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">PIN (6 Digit)</label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={pin} onChange={(val) => setPin(val)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500">
              Masuk
            </Button>
            <div className="text-center">
              <a href="/forgot-pin" className="text-xs text-blue-400 hover:underline">
                Lupa PIN? Reset via WhatsApp
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
