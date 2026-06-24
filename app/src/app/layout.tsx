import "./globals.css";
import Providers from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Quorum — The rug-proof launchpad</title>
        <meta name="description" content="Community validates before anyone funds. 9-month bilateral vesting. 0.1% holder limit. Built on Solana." />
        <meta property="og:title" content="Quorum — The rug-proof launchpad" />
        <meta property="og:description" content="The token launchpad where utility is the only metric that matters." />
        <meta name="twitter:site" content="@QuorumBuild" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-quorum-bg text-quorum-text font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
