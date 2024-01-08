import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Othello',
  description: 'Play Othello online against a friend or a computer. The AI is powered by reinforcement learning trained with self-play and probabilitic search.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} px-2 bg-gray-300`}>{children}</body>
    </html>
  )
}
