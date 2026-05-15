import './globals.css';

export const metadata = {
  title: 'Multi Manager - Financial & Account Management',
  description: 'Multi-platform financial tracking and account management system',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
