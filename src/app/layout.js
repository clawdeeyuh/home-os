import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata = {
  title: "Home OS",
  description: "Your domestic operating system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
