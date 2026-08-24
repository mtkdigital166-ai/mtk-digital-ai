'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
const links=[['/','Início'],['/criar','MTK AI / Criar'],['/campanhas','Campanhas'],['/calendario','Calendário'],['/biblioteca','Biblioteca'],['/brand-kit','Brand Kit'],['/creditos','Créditos'],['/planos','Planos'],['/configuracoes','Configurações']]
export default function AppShell({children}:{children:React.ReactNode}){
 const path=usePathname(); const publicPage=path.startsWith('/login')||path.startsWith('/cadastro')||path.startsWith('/auth')
 if(publicPage) return <main className="auth-main">{children}</main>
 return <div className="shell"><aside className="side"><div className="brand">MTK<br/><span>DIGITAL AI</span></div><nav className="nav">{links.map(([h,t])=><Link className={path===h?'active':''} key={h} href={h}>{t}</Link>)}</nav><form action="/auth/signout" method="post"><button className="logout" type="submit">Sair</button></form></aside><main className="main">{children}</main></div>
}
