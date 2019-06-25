import { Button, Input } from '@mycrypto/ui';
import { ENSStatus } from 'components/AddressFieldFactory/AddressInputFactory';
import { WhenQueryExists } from 'components/renderCbs';
import { Field, FieldProps, Form, Formik } from 'formik';
import React, { useContext } from 'react';
import translate, { translateRaw } from 'translations';
import { fetchGasPriceEstimates, getNonce, getResolvedENSAddress } from 'v2';
import { InlineErrorMsg } from 'v2/components';
import { getGasEstimate } from 'v2/features/Gas';
import { getAssetByUUID, getNetworkByName, getQueryParamWithKey, getQueryTransactionData, isAdvancedQueryTransaction, isQueryTransaction, queryObject } from 'v2/libs';
import { processFormDataToTx } from 'v2/libs/transaction/process';
import { AccountContext } from 'v2/providers';
import { Asset, AssetBalanceObject, ExtendedAccount, ExtendedAccount as IExtendedAccount } from 'v2/services';
// import { processFormDataToTx } from 'v2/libs/transaction/process';
import { IAsset, TSymbol } from 'v2/types';
import * as Yup from 'yup';
import { ITxFields, SendState } from '../types';
import TransactionFeeDisplay from './displays/TransactionFeeDisplay';
import TransactionValueDisplay from './displays/TransactionValuesDisplay';
import { AccountDropdown, AssetDropdown, DataField, EthAddressField, GasLimitField, GasPriceField, GasPriceSlider, NonceField } from './fields';
import './SendAssetsForm.scss';
import { validateDataField, validateGasLimitField, validateGasPriceField, validateNonceField } from './validators/validators';

interface Props {
  stateValues: SendState;
  onNext(): void;
  onSubmit(transactionFields: ITxFields): void;
  updateState(state: SendState): void;
}

const getInitialState = () => {
  if (isQueryTransaction(location.search)) {
    const params: queryObject = getQueryTransactionData(location.search);
    return {
      step: 0,
      transactionFields: {
        account: {
          label: '',
          address: '',
          network: '',
          assets: [],
          wallet: undefined,
          balance: '0',
          transactions: [],
          dPath: '',
          uuid: '',
          timestamp: 0
        },
        recipientAddress: getQueryParamWithKey(params, 'to') || '',
        amount: getQueryParamWithKey(params, 'value') || '',
        asset:
          getQueryParamWithKey(params, 'sendmode') === 'token'
            ? ({ symbol: getQueryParamWithKey(params, 'tokensymbol') || 'DAI' } as IAsset)
            : undefined,
        gasPriceSlider: '20',
        gasPriceField: getQueryParamWithKey(params, 'gasprice') || '20',
        gasLimitField:
          getQueryParamWithKey(params, 'gaslimit') ||
          getQueryParamWithKey(params, 'gas') ||
          '21000',
        gasLimitEstimated: '21000',
        nonceEstimated: '0',
        nonceField: '0',
        data: getQueryParamWithKey(params, 'data') || '',
        isAdvancedTransaction: isAdvancedQueryTransaction(location.search) || false, // Used to indicate whether transaction fee slider should be displayed and if Advanced Tab fields should be displayed.
        isGasLimitManual: false, // Used to indicate that user has un-clicked the user-input gas-limit checkbox.
        accountType: undefined,
        gasEstimates: {
          fastest: 20,
          fast: 18,
          standard: 12,
          isDefault: false,
          safeLow: 4,
          time: Date.now(),
          chainId: 1
        },
        network: undefined,
        resolvedNSAddress: '', // Address returned when attempting to resolve an ENS/RNS address.
        isResolvingNSName: false // Used to indicate recipient-address is ENS name that is currently attempting to be resolved.
      },
      isFetchingAccountValue: false, // Used to indicate looking up user's balance of currently-selected asset.
      isResolvingNSName: false, // Used to indicate recipient-address is ENS name that is currently attempting to be resolved.
      isAddressLabelValid: false, // Used to indicate if recipient-address is found in the address book.
      isFetchingAssetPricing: false, // Used to indicate fetching CC rates for currently-selected asset.
      isEstimatingGasLimit: false, // Used to indicate that gas limit is being estimated using `eth_estimateGas` jsonrpc call.
      resolvedNSAddress: '', // Address returned when attempting to resolve an ENS/RNS address.
      recipientAddressLabel: '', //  Recipient-address label found in address book.
      asset: undefined,
      assetType: getQueryParamWithKey(params, 'sendmode') === 'token' ? 'erc20' : 'base',
      signedTransaction: ''
    };
  } else {
    return {
      step: 0,
      transactionFields: {
        account: {
          label: '',
          address: '',
          network: '',
          assets: [],
          wallet: undefined,
          balance: '0',
          transactions: [],
          dPath: '',
          uuid: '',
          timestamp: 0
        },
        recipientAddress: '',
        amount: '', // Really should be undefined, but Formik recognizes empty strings.
        asset: undefined,
        gasPriceSlider: '20',
        gasPriceField: '20',
        gasLimitField: '21000',
        gasLimitEstimated: '21000',
        nonceEstimated: '0',
        nonceField: '0',
        data: '',
        isAdvancedTransaction: false, // Used to indicate whether transaction fee slider should be displayed and if Advanced Tab fields should be displayed.
        isGasLimitManual: false,
        accountType: undefined,
        gasEstimates: {
          fastest: 20,
          fast: 18,
          standard: 12,
          isDefault: false,
          safeLow: 4,
          time: Date.now(),
          chainId: 1
        },
        network: undefined
      },

      resolvedNSAddress: '', // Address returned when attempting to resolve an ENS/RNS address.
      recipientAddressLabel: '', //  Recipient-address label found in address book.
      asset: undefined,
      assetType: 'base', // Type of asset selected. Directs how rawTransactionValues field are handled when formatting transaction.
      signedTransaction: ''
    };
  }
};

const QueryWarning: React.SFC<{}> = () => (
  <WhenQueryExists
    whenQueryExists={
      <div className="alert alert-info">
        <p>{translate('WARN_SEND_LINK')}</p>
      </div>
    }
  />
);

const SendAssetsSchema = Yup.object().shape({
  amount: Yup.number()
    .required('Required')
    .min(0.001, 'Minimun required')
    .max(1001, 'Above the balance')
});

export default function SendAssetsForm({ onNext, onSubmit }: Props) {
  const { accounts } = useContext(AccountContext);
  // @TODO:SEND change the data structure to get an object

  const accountAssets: AssetBalanceObject[] = accounts.flatMap(a => a.assets);

  const assets: IAsset[] = accountAssets
    .map((assetObj: AssetBalanceObject) => getAssetByUUID(assetObj.uuid))
    .filter((asset: Asset | undefined) => asset)
    .map((asset: Asset) => {
      return { symbol: asset.ticker as TSymbol, name: asset.name, network: asset.networkId };
    });

  return (
    <div className="SendAssetsForm">
      <Formik
        initialValues={getInitialState()}
        validationSchema={SendAssetsSchema}
        onSubmit={(fields: ITxFields) => {
          onSubmit(fields);
          onNext();
        }}
        render={({ errors, touched, setFieldValue, values, handleChange, submitForm }) => {
          const toggleAdvancedOptions = () =>
            setFieldValue('isAdvancedTransaction', !values.isAdvancedTransaction);

          const handleGasEstimate = async () => {
            if (!values || !values.network) {
              return;
            }
            const finalTx = processFormDataToTx(values);
            if (!finalTx) {
              return;
            }
            const gas = await getGasEstimate(values.network, finalTx);
            setFieldValue('gasLimitEstimated', gas);
          };

          const handleENSResolve = async (name: string) => {
            if (!values || !values.network) {
              return;
            }
            setFieldValue('isResolvingNSName', true);
            const resolvedAddress: string | null = await getResolvedENSAddress(
              values.network,
              name
            );
            setFieldValue('isResolvingNSName', false);
            resolvedAddress === null
              ? setFieldValue('resolvedNSAddress', '0x0')
              : setFieldValue('resolvedNSAddress', resolvedAddress);
          };

          const handleFieldReset = () => {
            setFieldValue('account', undefined);
            setFieldValue('recipientAddress', '');
            setFieldValue('amount', '');
          };

          const setAmountFieldToAssetMax = () =>
            // @TODO get asset balance and subtract gas cost
            setFieldValue('amount', '1000');

          const handleNonceEstimate = async (account: ExtendedAccount) => {
            if (!values || !values.network) {
              return;
            }
            const nonce: number = await getNonce(values.network, account);
            setFieldValue('nonceEstimated', nonce.toString());
          };

          return (
            <Form className="SendAssetsForm">
              <React.Fragment>
                {'ITxFields123: '}
                <br />
                <pre style={{ fontSize: '0.5rem' }}>
                  {JSON.stringify(processFormDataToTx(values), null, 2)}
                </pre>
              </React.Fragment>
              <br />
              {'Formik Fields: '}
              <br />
              <pre style={{ fontSize: '0.75rem' }}>{`Gas Limit Estimated: ${
                values.gasLimitEstimated
              }`}</pre>
              <QueryWarning />

              {/* Asset */}
              <fieldset className="SendAssetsForm-fieldset">
                <label htmlFor="asset" className="input-group-header">
                  {translate('X_ASSET')}
                </label>
                <Field
                  name="asset"
                  component={({ field, form }: FieldProps) => (
                    <AssetDropdown
                      name={field.name}
                      value={field.value}
                      assets={assets}
                      onSelect={option => {
                        form.setFieldValue(field.name, option);
                        handleFieldReset();

                        if (option.network) {
                          fetchGasPriceEstimates(option.network).then(data => {
                            form.setFieldValue('gasEstimates', data);
                            form.setFieldValue('gasPriceSlider', data.fast);
                          });
                          form.setFieldValue('network', getNetworkByName(option.network));
                          handleGasEstimate();
                        }
                      }}
                    />
                  )}
                />
              </fieldset>
              {/* Sender Address */}
              <fieldset className="SendAssetsForm-fieldset">
                <label htmlFor="account" className="input-group-header">
                  {translate('X_ADDRESS')}
                </label>
                <Field
                  name="account"
                  value={values.account}
                  component={({ field, form }: FieldProps) => (
                    <AccountDropdown
                      values={values}
                      name={field.name}
                      value={field.value}
                      accounts={accounts}
                      onSelect={(option: IExtendedAccount) => {
                        form.setFieldValue(field.name, option);
                        handleNonceEstimate(option);
                        handleGasEstimate();
                      }}
                    />
                  )}
                />
              </fieldset>
              <fieldset className="SendAssetsForm-fieldset">
                <label htmlFor="recipientAddress" className="input-group-header">
                  {translate('SEND_ADDR')}
                </label>
                <EthAddressField
                  handleENSResolve={handleENSResolve}
                  error={errors.recipientAddress}
                  touched={touched.recipientAddress}
                  values={values.}
                  fieldName="recipientAddress"
                  placeholder="Enter an Address or Contact"
                />
                <ENSStatus
                  ensAddress={values.recipientAddress}
                  isLoading={values.isResolvingNSName}
                  rawAddress={values.resolvedNSAddress}
                  chainId={values.network ? values.network.chainId : 1}
                />
              </fieldset>
              {/* Amount */}
              <fieldset className="SendAssetsForm-fieldset">
                <label htmlFor="amount" className="input-group-header label-with-action">
                  <div>{translate('SEND_ASSETS_AMOUNT_LABEL')}</div>
                  <div className="label-action" onClick={setAmountFieldToAssetMax}>
                    {translateRaw('SEND_ASSETS_AMOUNT_LABEL_ACTION').toLowerCase()}
                  </div>
                </label>
                <Field
                  name="amount"
                  render={({ field }: FieldProps) => (
                    <Input value={field.value} placeholder={'0.00'} {...field} />
                  )}
                />
                {errors.amount && touched.amount ? (
                  <InlineErrorMsg className="SendAssetsForm-errors">{errors.amount}</InlineErrorMsg>
                ) : null}
              </fieldset>
              {/* You'll Send */}
              <fieldset className="SendAssetsForm-fieldset SendAssetsForm-fieldset-youllSend">
                <label>You'll Send</label>
                <TransactionValueDisplay
                  amount={values.amount || '0.00'}
                  ticker={values.asset ? values.asset.symbol : ('ETH' as TSymbol)}
                  fiatAsset={{ ticker: 'USD' as TSymbol, exchangeRate: '250' }}
                />
              </fieldset>
              {/* Transaction Fee */}
              <fieldset className="SendAssetsForm-fieldset">
                <label htmlFor="transactionFee" className="SendAssetsForm-fieldset-transactionFee">
                  <div>Transaction Fee</div>
                  {/* TRANSLATE THIS */}
                  <TransactionFeeDisplay
                    values={values}
                    fiatAsset={{ fiat: 'USD', value: '250', symbol: '$' }}
                  />
                  {/* TRANSLATE THIS */}
                </label>
                {!values.isAdvancedTransaction && (
                  <GasPriceSlider
                    transactionFieldValues={values}
                    handleChange={(e: string) => {
                      handleGasEstimate();
                      handleChange(e);
                    }}
                    gasPrice={values.gasPriceSlider}
                    gasEstimates={values.gasEstimates}
                  />
                )}
              </fieldset>
              {/* Advanced Options */}
              <div className="SendAssetsForm-advancedOptions">
                <Button
                  basic={true}
                  onClick={toggleAdvancedOptions}
                  className="SendAssetsForm-advancedOptions-button"
                >
                  {values.isAdvancedTransaction ? 'Hide' : 'Show'} Advanced Options
                </Button>
                {values.isAdvancedTransaction && (
                  <div className="SendAssetsForm-advancedOptions-content">
                    <div className="SendAssetsForm-advancedOptions-content-automaticallyCalculate">
                      <Field name="isGasLimitManual" type="checkbox" value={true} />
                      <label htmlFor="isGasLimitManual">
                        Automatically Calculate Gas Limit{/* TRANSLATE THIS */}
                      </label>
                    </div>
                    <div className="SendAssetsForm-advancedOptions-content-priceLimitNonce">
                      <div className="SendAssetsForm-advancedOptions-content-priceLimitNonce-price">
                        <label htmlFor="gasPrice">{translate('OFFLINE_STEP2_LABEL_3')}</label>
                        <Field
                          name="gasPriceField"
                          validate={validateGasPriceField}
                          render={({ field, form }: FieldProps<ITxFields>) => (
                            <GasPriceField
                              onChange={(option: string) => {
                                form.setFieldValue(field.name, option);
                              }}
                              name={field.name}
                              value={field.value}
                            />
                          )}
                        />
                      </div>
                      <div className="SendAssetsForm-advancedOptions-content-priceLimitNonce-price">
                        <label htmlFor="gasLimit">{translate('OFFLINE_STEP2_LABEL_4')}</label>
                        <Field
                          name="gasLimitField"
                          validate={validateGasLimitField}
                          render={({ field, form }: FieldProps<ITxFields>) => (
                            <GasLimitField
                              onChange={(option: string) => {
                                form.setFieldValue(field.name, option);
                              }}
                              name={field.name}
                              value={field.value}
                            />
                          )}
                        />
                      </div>
                      <div className="SendAssetsForm-advancedOptions-content-priceLimitNonce-nonce">
                        <label htmlFor="nonce">Nonce (?)</label>
                        <Field
                          name="nonceField"
                          validate={validateNonceField}
                          render={({ field, form }: FieldProps<ITxFields>) => (
                            <NonceField
                              onChange={(option: string) => {
                                form.setFieldValue(field.name, option);
                              }}
                              name={field.name}
                              value={field.value}
                            />
                          )}
                        />
                      </div>
                    </div>
                    <div className="SendAssetsForm-errors">
                      {errors.gasPriceField && (
                        <InlineErrorMsg>{errors.gasPriceField}</InlineErrorMsg>
                      )}
                      {errors.gasLimitField && (
                        <InlineErrorMsg>{errors.gasLimitField}</InlineErrorMsg>
                      )}
                      {errors.nonceField && <InlineErrorMsg>{errors.nonceField}</InlineErrorMsg>}
                    </div>
                    <fieldset className="SendAssetsForm-fieldset">
                      <label htmlFor="data">Data{/* TRANSLATE THIS */}</label>
                      <Field
                        name="data"
                        validate={validateDataField}
                        render={({ field, form }: FieldProps<ITxFields>) => (
                          <DataField
                            onChange={(option: string) => {
                              form.setFieldValue(field.name, option);
                            }}
                            errors={errors.data}
                            name={field.name}
                            value={field.value}
                          />
                        )}
                      />
                    </fieldset>
                    <div className="SendAssetsForm-advancedOptions-content-output">
                      0 + 13000000000 * 1500000 + 20000000000 * (180000 + 53000) = 0.02416 ETH ~=
                      {/* TRANSLATE THIS */}
                      $2.67 USD{/* TRANSLATE THIS */}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" onClick={submitForm} className="SendAssetsForm-next">
                Next{/* TRANSLATE THIS */}
              </Button>
            </Form>
          );
        }}
      />
    </div>
  );
}
