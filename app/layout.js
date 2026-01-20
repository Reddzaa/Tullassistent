export const metadata = {
  title: "Tullassistent",
  description: "En enkel tull- och importassistent.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
