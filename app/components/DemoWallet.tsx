import { getDemoUserId } from '@/app/lib/demo-user'
import WalletDisplay from './WalletDisplay'

export default async function DemoWallet() {
  const demoUserId = await getDemoUserId()
  return <WalletDisplay userId={demoUserId} />
}