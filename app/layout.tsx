import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Slotty — The Lucky Club',
  description:
    'Spin, win, and invest in luck upgrades. A virtual-money incremental slot game.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
