import React, { Component } from 'react';
import { DeepPartial } from 'shared/types/util';
import { WalletName } from 'v2/config/data';
import { ITxFields } from '../types';
import './SignTransaction.scss';
import {
  SignTransactionKeystore,
  SignTransactionLedger,
  SignTransactionMetaMask,
  SignTransactionPrivateKey,
  SignTransactionSafeT,
  SignTransactionTrezor
} from './SignTransactionWallets';

type WalletType = WalletName;

interface Props {
  stateValues: SendStTxFields;
  transactionFields: ITxFields;
  onNext(): void;
  TxFields;
  onSubmit(transactionFields: ITxFields): void;
  updateState(state: DeepPartial<SendState>): void;
}

export default class SignTransaction extends Component<Props> {
  public render() {
    const { stateValues, transactionFields, onNext, updateState } = this.props;
    const currentWalletType: WalletType = transactionFields.account.wallet;

    switch (currentWalletType) {
      case 'privateKey':
        return <SignTransactionPrivateKey />;
      case 'web3':
        return (
          <SignTransactionMetaMask
            stateValues={stateValues}
            transactionFields={transactionFields}
            onNext={receipt => {
              const nextState: DeepPartial<SendState> = {
                transactionFields: { account: { transactions: [{ txHash: receipt.hash }] } }
              };
              updateState(nextState);
              onNext();
            }}
          />
        );
      case 'ledgerNanoS':
        return <SignTransactionLedger />;
      case 'trezor':
        return <SignTransactionTrezor />;
      case 'safeTmini':
        return <SignTransactionSafeT />;
      case 'keystoreFile':
        return (
          //@ts-ignoretslint-ignore
          <SignTransactionKeystore
            stateValues={stateValues}
            transactionFields={transactionFields}
            onNext={signedTransaction => {
              const nextState: DeepPartial<SendState> = {
                signedTransaction
              };

              updateState(nextState);
              onNext();
            }}
          />
        );
      default:
        return null;
    }
  }
}
