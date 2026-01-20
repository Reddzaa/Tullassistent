import "./globals.css";

export const metadata = {
  title: "Tullassistent",
  description: "Svensk–norsk tull, import, export och transiter"
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
