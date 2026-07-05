import { api, hasAuthForWallet, storeAuthToken } from '@/api/apiClient';
import { getEthereumProvider } from '@/lib/web3';

export async function ensureWalletAuth(wallet: string): Promise<void> {
  if (hasAuthForWallet(wallet)) return;
  const provider = getEthereumProvider();
  if (!provider) throw new Error('wallet_provider_missing');
  const challenge = await api.auth.nonce(wallet);
  const signature = await provider.request<string>({
    method: 'personal_sign',
    params: [challenge.message, wallet],
  });
  const verified = await api.auth.verify({ wallet, nonce: challenge.nonce, signature });
  storeAuthToken(verified.wallet, verified.token);
}
