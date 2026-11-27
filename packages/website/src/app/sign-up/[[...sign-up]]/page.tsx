'use client';

import { SignUp } from '@/lib/authClient';

export default function SignUpPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f9fafb'
    }}>
      <SignUp />
    </div>
  );
} 