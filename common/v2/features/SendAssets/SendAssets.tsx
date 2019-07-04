// Legacy
import sendIcon from 'common/assets/images/icn-send.svg';
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { ContentPanel } from 'v2/components';
import { Layout } from 'v2/features';
import {
  ConfirmTransaction,
  SendAssetsForm,
  SignTransaction,
  TransactionReceipt
} from './components';
import { SendState } from './types';

const steps = [
  { label: 'Send Assets', elem: SendAssetsForm },
  { label: '', elem: SignTransaction },
  { label: 'ConfirmTransaction', elem: ConfirmTransaction },
  { label: 'Transaction Complete', elem: TransactionReceipt }
];

// due to MetaMask deprecating eth_sign method, it has different step order, where sign and send are one panel
const web3Steps = [
  { label: 'Send Assets', elem: SendAssetsForm },
  { label: 'ConfirmTransaction', elem: ConfirmTransaction },
  { label: '', elem: SignTransaction },
  { label: 'Transaction Complete', elem: TransactionReceipt }
];

export class SendAssets extends Component<RouteComponentProps<{}>, SendState> {
  public state: SendState = {
    step: 0,
    transactionData: {
      to: '',
      gasLimit: '',
      gasPrice: '',
      nonce: '',
      data: '',
      value: '',
      chainId: undefined
    },
    senderAddress: '',
    senderAddressLabel: '',
    senderWalletBalanceBase: '',
    senderWalletBalanceToken: '',
    senderAccountType: '',
    senderNetwork: '',
    assetType: undefined,
    dPath: '',
    recipientAddress: '',
    recipientAddressLabel: '',
    recipientResolvedNSAddress: '',
    serializedTransaction: '',
    signedTransaction: '',
    txHash: ''
  };

  public render() {
    const { step } = this.state;
    const Step = steps[step];
    const Web3Steps = web3Steps[step];

    return (
      <Layout className="SendAssets" centered={true}>
        <ContentPanel
          onBack={this.goToPrevStep}
          className="SendAssets"
          heading={this.state.senderAccountType === 'web3' ? Web3Steps.label : Step.label}
          icon={sendIcon}
          stepper={{ current: step + 1, total: steps.length - 1 }}
        >
          {this.state.senderAccountType === 'web3' ? (
            //@ts-ignoretslint-ignore //deprecated eth_sign
            <Web3Steps.elem
              onNext={this.goToNextStep}
              updateState={this.updateState}
              stateValues={this.state}
            />
          ) : (
            <Step.elem
              onNext={this.goToNextStep}
              updateState={this.updateState}
              stateValues={this.state}
            />
          )}
        </ContentPanel>
      </Layout>
    );
  }

  private goToNextStep = () =>
    this.setState((prevState: SendState) => ({
      step: Math.min(prevState.step + 1, steps.length - 1)
    }));

  private goToPrevStep = () =>
    this.setState((prevState: SendState) => ({
      step: Math.max(0, prevState.step - 1)
    }));

  private updateState = (state: SendState) => {
    this.setState(state);
  };

  // private handleReset = () => this.setState(getInitialState());
}

export default withRouter(SendAssets);
