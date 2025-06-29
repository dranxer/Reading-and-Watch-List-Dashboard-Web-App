import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'ReadWatch Tracker',
  description: 'Track and organize your reading and watching habits with AI',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
