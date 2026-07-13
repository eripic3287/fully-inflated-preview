export const metadata = {
  title: "Fully Inflated",
  description: "Pricing coach for event decor businesses",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="fi-root" style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
