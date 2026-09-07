import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Apartment Atlas',description:'Explore a private 3D reconstruction of your apartment, with source photographs and a live build journal.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
