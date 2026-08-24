import './globals.css'
import AppShell from '@/components/AppShell'
export const metadata={title:'MTK DIGITAL AI',description:'Marketing inteligente para empresas locais'}
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><AppShell>{children}</AppShell></body></html>}
