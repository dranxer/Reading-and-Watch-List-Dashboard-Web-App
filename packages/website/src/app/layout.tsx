import "./globals.css";
import { AuthProvider } from '@/lib/authClient';

export const metadata = {
  title: 'ReadWatch — your reading and watching library',
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
    <AuthProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&display=swap" rel="stylesheet" />
        </head>
        <body>
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
