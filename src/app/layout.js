import './globals.css';

export const metadata = {
  title: 'Multi Manager - Financial & Account Management',
  description: 'Multi-platform financial tracking and account management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
