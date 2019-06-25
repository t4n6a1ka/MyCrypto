import { GasEstimates } from 'v2/api/gas';
import { WalletName } from 'v2/config/data';
import { ExtendedAccount as IExtendedAccount, Network } from 'v2/services';
import { IAsset } from 'v2/types';

export interface ITxFields {
  asset: IAsset | undefined;
  recipientAddress: string;
  amount: string;
  account: IExtendedAccount;
  data: string;
  gasLimitEstimated: string;
  gasPriceSlider: string;
  nonceEstimated: string;
  gasLimitField: string; // Use only if advanced tab is open AND isGasLimitManual is true
  gasPriceField: string; // Use only if advanced tab is open AND user has input gas price
  nonceField: string; // Use only if user has input a manual nonce value.
  isAdvancedTransaction: boolean; // Used to indicate whether transaction fee slider should be displayed and if Advanced Tab fields should be displayed.
  isGasLimitManual: boolean; // Used to indicate that user has un-clicked the user-input gas-limit checkbox.
  accountType: WalletName | undefined; // Type of wallet selected.
  network: Network | undefined;
  gasEstimates: GasEstimates;
  resolvedNSAddress: string; // Address returned when attempting to resolve an ENS/RNS address.
  isResolvingNSName: boolean; // Used to indicate recipient-address is ENS name that is currently attempting to be resolved.
}

export interface SendState {
  step: number;
  senderAddress: string;
  senderAddressLabel: string;
  senderWalletBalance: string;
  senderAccountType: undefined;
  dPath: string | undefined;
  recipientAddress: string;
  recipientAddressLabel: string;
  recipientResolvedNSAddress: string;
  asset: undefined;
  amount: string;
  nonce: string;
  data: string;
  network: undefined;
  gasPrice: string;
  gasLimit: string;
  signedTransaction: string;
  txHash: string;
}
