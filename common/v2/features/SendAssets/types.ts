import { assetMethod } from 'v2';

export interface TxFields {
  to: string;
  gasLimit: string;
  gasPrice: string;
  nonce: string;
  data: string;
  value: string;
  chainId: number | undefined;
}

export interface SendState {
  step: number;
  transactionData: TxFields;
  senderAddress: string;
  senderAddressLabel: string;
  senderWalletBalanceBase: string;
  senderWalletBalanceToken?: string;
  senderAccountType: string;
  senderNetwork: string;
  assetType: assetMethod | undefined;
  dPath: string;
  recipientAddress: string;
  recipientAddressLabel: string;
  recipientResolvedNSAddress: string;
  serializedTransaction: string;
  signedTransaction: string;
  txHash: string;
}
