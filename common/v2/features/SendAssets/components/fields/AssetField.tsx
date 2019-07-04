import { ComboBox } from '@mycrypto/ui';
import { Field, FieldProps, Formik } from 'formik';
import React, { ChangeEvent, Component } from 'react';
import { AccountContext, NetworksContext } from 'v2/providers';
import { Network } from 'v2/services/Network/types';
import { TxFields } from '../../types';

interface OwnProps {
  handleChange: Formik['handleChange'];
}

type Props = OwnProps;

export default class AssetField extends Component<Props> {
  public isValidAmount = (value: any) => {
    const valid = value >= 0;
    this.setState({ isValidAmount: valid });
    return valid;
  };

  public handleAssetField = (e: ChangeEvent<any>) => {
    // Conduct estimateGas
    // Conduct clearFields
    this.props.handleChange(e);
  };

  // @TODO:SEND delete file once we determine how to store assets
  public render() {
    return (
      <div className="SendAssetsForm-amountAsset-asset">
        <label htmlFor="asset">Asset</label>
        <AccountContext.Consumer>
          {({ accounts }) => (
            <NetworksContext.Consumer>
              {({ networks }) => {
                // Networks of all accounts
                const relevantNetworks: string[] = [
                  ...new Set(accounts.map(account => account.network))
                ];

                const assetslist: string[] = [];
                // For each network
                relevantNetworks.map(en => {
                  // get the Network
                  const network: Network | undefined = networks.find(
                    networkEntry => networkEntry.name === en
                  );
                  // and get associated assets
                  if (network) {
                    assetslist.push(...network.assets);
                  }
                });
                return (
                  <Field
                    id={'7'}
                    name="asset"
                    render={({ field }: FieldProps<TxFields>) => (
                      <ComboBox
                        {...field}
                        id={'8'}
                        onChange={this.handleAssetField}
                        value={field.value}
                        items={new Set(assetslist)}
                        className="SendAssetsForm-fieldset-input"
                      />
                    )}
                  />
                );
              }}
            </NetworksContext.Consumer>
          )}
        </AccountContext.Consumer>
      </div>
    );
  }
}
