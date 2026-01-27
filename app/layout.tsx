import './globals.css'
import './offline-fonts.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Melann HR Management System',
    description: 'Comprehensive HR Management System for Philippine Companies with Digital 201 File Masterlist',
    keywords: 'HR, 201 File, Employee Management, Philippine HR, DOLE Compliance',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
