import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'Personal Knowledge Tracker',
  description: 'Track and organize your knowledge consumption',
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
