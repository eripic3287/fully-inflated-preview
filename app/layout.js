import "./globals.css";

export const metadata = {
  title: "Fully Inflated — Preview",
  description: "Business coaching that lives inside your invoices",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
