import { getWorkspace } from '@/lib/workspace'
import CreateAI from '@/components/CreateAI'
export default async function Criar(){const {company}=await getWorkspace();return <CreateAI companyName={company!.name}/>} 
