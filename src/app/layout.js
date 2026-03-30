import "./globals.css";

export const metadata = {
  title: "Home OS",
  description: "Your domestic operating system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
