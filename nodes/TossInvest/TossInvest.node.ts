import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type TossCredentials = ICredentialDataDecryptedObject & {
	clientId: string;
	clientSecret: string;
	accountSeq?: string;
	baseUrl?: string;
};

type HttpMethod = 'GET' | 'POST';

const resourceOptions = [
	{
		name: 'Account',
		value: 'account',
	},
	{
		name: 'Asset',
		value: 'asset',
	},
	{
		name: 'Market Data',
		value: 'marketData',
	},
	{
		name: 'Market Info',
		value: 'marketInfo',
	},
	{
		name: 'Order',
		value: 'order',
	},
	{
		name: 'Order History',
		value: 'orderHistory',
	},
	{
		name: 'Order Info',
		value: 'orderInfo',
	},
	{
		name: 'Stock Info',
		value: 'stockInfo',
	},
];

const accountRequiredResources = ['asset', 'order', 'orderHistory', 'orderInfo'];

function baseUrl(credentials: TossCredentials) {
	return (credentials.baseUrl || 'https://openapi.tossinvest.com').replace(/\/$/, '');
}

function addIfPresent(target: IDataObject, key: string, value: boolean | number | string) {
	if (value !== '') {
		target[key] = value;
	}
}

async function getAccessToken(
	executeFunctions: IExecuteFunctions,
	credentials: TossCredentials,
): Promise<string> {
	const response = (await executeFunctions.helpers.httpRequest({
		method: 'POST',
		url: `${baseUrl(credentials)}/oauth2/token`,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
		}).toString(),
		json: true,
	}) as IDataObject) || {};

	if (typeof response.access_token !== 'string') {
		throw new NodeOperationError(executeFunctions.getNode(), 'Toss Invest token response did not include access_token.');
	}

	return response.access_token;
}

async function tossInvestRequest(
	executeFunctions: IExecuteFunctions,
	credentials: TossCredentials,
	accessToken: string,
	method: HttpMethod,
	endpoint: string,
	qs: IDataObject = {},
	body?: IDataObject,
	accountSeq?: string,
) {
	const headers: IDataObject = {
		Accept: 'application/json',
		Authorization: `Bearer ${accessToken}`,
	};

	if (accountSeq) {
		headers['X-Tossinvest-Account'] = accountSeq;
	}

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl(credentials)}${endpoint}`,
		headers,
		qs,
		json: true,
	};

	if (body) {
		headers['Content-Type'] = 'application/json';
		options.body = body;
	}

	return await executeFunctions.helpers.httpRequest(options);
}

function resolveAccountSeq(
	executeFunctions: IExecuteFunctions,
	credentials: TossCredentials,
	itemIndex: number,
) {
	const nodeAccountSeq = executeFunctions.getNodeParameter('accountSeq', itemIndex, '') as string;
	const accountSeq = nodeAccountSeq || credentials.accountSeq || '';

	if (!accountSeq) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Account Sequence is required for this Toss Invest operation. Use Account > Get Many to find accountSeq, then set it in credentials or this node.',
			{ itemIndex },
		);
	}

	return accountSeq;
}

function accountSeqProperty(): INodeProperties {
	return {
		displayName: 'Account Sequence',
		name: 'accountSeq',
		type: 'string',
		default: '',
		description: 'accountSeq from Account > Get Many. Leave empty to use the credential default.',
		displayOptions: {
			show: {
				resource: accountRequiredResources,
			},
		},
	};
}

export class TossInvest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toss Invest',
		name: 'tossInvest',
		icon: 'file:tossinvest.svg',
		group: ['transform'],
		version: 1,
		description: 'Use the Toss Securities Open API',
		defaults: {
			name: 'Toss Invest',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'tossInvestApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: resourceOptions,
				default: 'marketData',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get many accounts',
					},
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['asset'],
					},
				},
				options: [
					{
						name: 'Get Holdings',
						value: 'getHoldings',
						action: 'Get holdings',
					},
				],
				default: 'getHoldings',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['marketData'],
					},
				},
				options: [
					{
						name: 'Get Candles',
						value: 'getCandles',
						action: 'Get candles',
					},
					{
						name: 'Get Orderbook',
						value: 'getOrderbook',
						action: 'Get orderbook',
					},
					{
						name: 'Get Price Limits',
						value: 'getPriceLimits',
						action: 'Get price limits',
					},
					{
						name: 'Get Prices',
						value: 'getPrices',
						action: 'Get prices',
					},
					{
						name: 'Get Trades',
						value: 'getTrades',
						action: 'Get trades',
					},
				],
				default: 'getPrices',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['marketInfo'],
					},
				},
				options: [
					{
						name: 'Get Exchange Rate',
						value: 'getExchangeRate',
						action: 'Get exchange rate',
					},
					{
						name: 'Get KR Market Calendar',
						value: 'getKrMarketCalendar',
						action: 'Get KR market calendar',
					},
					{
						name: 'Get US Market Calendar',
						value: 'getUsMarketCalendar',
						action: 'Get US market calendar',
					},
				],
				default: 'getExchangeRate',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['order'],
					},
				},
				options: [
					{
						name: 'Cancel',
						value: 'cancel',
						action: 'Cancel an order',
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create an order',
					},
					{
						name: 'Modify',
						value: 'modify',
						action: 'Modify an order',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['orderHistory'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get an order',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get many orders',
					},
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['orderInfo'],
					},
				},
				options: [
					{
						name: 'Get Buying Power',
						value: 'getBuyingPower',
						action: 'Get buying power',
					},
					{
						name: 'Get Commissions',
						value: 'getCommissions',
						action: 'Get commissions',
					},
					{
						name: 'Get Sellable Quantity',
						value: 'getSellableQuantity',
						action: 'Get sellable quantity',
					},
				],
				default: 'getBuyingPower',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['stockInfo'],
					},
				},
				options: [
					{
						name: 'Get Stocks',
						value: 'getStocks',
						action: 'Get stocks',
					},
					{
						name: 'Get Warnings',
						value: 'getWarnings',
						action: 'Get stock warnings',
					},
				],
				default: 'getStocks',
			},
			accountSeqProperty(),
			{
				displayName: 'Symbols',
				name: 'symbols',
				type: 'string',
				default: '',
				required: true,
				placeholder: '005930,AAPL',
				description: 'Comma-separated symbols. Up to 200 symbols are supported by the API.',
				displayOptions: {
					show: {
						resource: ['marketData', 'stockInfo'],
						operation: ['getPrices', 'getStocks'],
					},
				},
			},
			{
				displayName: 'Symbol',
				name: 'symbol',
				type: 'string',
				default: '',
				required: true,
				placeholder: '005930',
				displayOptions: {
					show: {
						resource: ['marketData', 'orderInfo', 'stockInfo'],
						operation: [
							'getCandles',
							'getOrderbook',
							'getPriceLimits',
							'getTrades',
							'getSellableQuantity',
							'getWarnings',
						],
					},
				},
			},
			{
				displayName: 'Symbol',
				name: 'symbol',
				type: 'string',
				default: '',
				placeholder: '005930',
				description: 'Optional symbol filter. Leave empty to return all holdings.',
				displayOptions: {
					show: {
						resource: ['asset'],
						operation: ['getHoldings'],
					},
				},
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'options',
				options: [
					{
						name: '1 Minute',
						value: '1m',
					},
					{
						name: '1 Day',
						value: '1d',
					},
				],
				default: '1d',
				displayOptions: {
					show: {
						resource: ['marketData'],
						operation: ['getCandles'],
					},
				},
			},
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 200,
				},
				default: 100,
				displayOptions: {
					show: {
						resource: ['marketData'],
						operation: ['getCandles'],
					},
				},
			},
			{
				displayName: 'Count',
				name: 'tradeCount',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
				default: 50,
				displayOptions: {
					show: {
						resource: ['marketData'],
						operation: ['getTrades'],
					},
				},
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Exclusive ISO 8601 pagination upper bound. Use nextBefore from the previous response.',
				displayOptions: {
					show: {
						resource: ['marketData'],
						operation: ['getCandles'],
					},
				},
			},
			{
				displayName: 'Adjusted',
				name: 'adjusted',
				type: 'boolean',
				default: true,
				description: 'Whether to use adjusted prices',
				displayOptions: {
					show: {
						resource: ['marketData'],
						operation: ['getCandles'],
					},
				},
			},
			{
				displayName: 'Base Currency',
				name: 'baseCurrency',
				type: 'options',
				options: [
					{
						name: 'USD',
						value: 'USD',
					},
					{
						name: 'KRW',
						value: 'KRW',
					},
				],
				default: 'USD',
				displayOptions: {
					show: {
						resource: ['marketInfo'],
						operation: ['getExchangeRate'],
					},
				},
			},
			{
				displayName: 'Quote Currency',
				name: 'quoteCurrency',
				type: 'options',
				options: [
					{
						name: 'KRW',
						value: 'KRW',
					},
					{
						name: 'USD',
						value: 'USD',
					},
				],
				default: 'KRW',
				displayOptions: {
					show: {
						resource: ['marketInfo'],
						operation: ['getExchangeRate'],
					},
				},
			},
			{
				displayName: 'Date Time',
				name: 'dateTime',
				type: 'dateTime',
				default: '',
				description: 'Optional date-time for historical exchange rate lookup',
				displayOptions: {
					show: {
						resource: ['marketInfo'],
						operation: ['getExchangeRate'],
					},
				},
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'string',
				default: '',
				placeholder: '2026-03-25',
				description: 'Optional market calendar date in YYYY-MM-DD format',
				displayOptions: {
					show: {
						resource: ['marketInfo'],
						operation: ['getKrMarketCalendar', 'getUsMarketCalendar'],
					},
				},
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['order', 'orderHistory'],
						operation: ['cancel', 'modify', 'get'],
					},
				},
			},
			{
				displayName: 'Order Mode',
				name: 'orderMode',
				type: 'options',
				options: [
					{
						name: 'Quantity Based',
						value: 'quantity',
					},
					{
						name: 'Amount Based (US Market Only)',
						value: 'amount',
					},
				],
				default: 'quantity',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Client Order ID',
				name: 'clientOrderId',
				type: 'string',
				default: '',
				description: 'Optional idempotency key. Maximum 36 characters, letters, numbers, dash, and underscore.',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Symbol',
				name: 'orderSymbol',
				type: 'string',
				default: '',
				required: true,
				placeholder: '005930',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Side',
				name: 'side',
				type: 'options',
				options: [
					{
						name: 'Buy',
						value: 'BUY',
					},
					{
						name: 'Sell',
						value: 'SELL',
					},
				],
				default: 'BUY',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Order Type',
				name: 'orderType',
				type: 'options',
				options: [
					{
						name: 'Limit',
						value: 'LIMIT',
					},
					{
						name: 'Market',
						value: 'MARKET',
					},
				],
				default: 'LIMIT',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create', 'modify'],
						orderMode: ['quantity'],
					},
				},
			},
			{
				displayName: 'Time In Force',
				name: 'timeInForce',
				type: 'options',
				options: [
					{
						name: 'Day',
						value: 'DAY',
					},
					{
						name: 'At the Close',
						value: 'CLS',
					},
				],
				default: 'DAY',
				description: 'CLS is currently supported for US limit orders',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create'],
						orderMode: ['quantity'],
					},
				},
			},
			{
				displayName: 'Quantity',
				name: 'quantity',
				type: 'string',
				default: '',
				required: true,
				description: 'Whole-share order quantity',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create'],
						orderMode: ['quantity'],
					},
				},
			},
			{
				displayName: 'Quantity',
				name: 'modifyQuantity',
				type: 'string',
				default: '',
				description: 'Required for KR modify requests. Do not provide for US modify requests.',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['modify'],
					},
				},
			},
			{
				displayName: 'Order Amount',
				name: 'orderAmount',
				type: 'string',
				default: '',
				required: true,
				description: 'US MARKET amount-based order amount in dollars',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create'],
						orderMode: ['amount'],
					},
				},
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'string',
				default: '',
				required: true,
				description: 'Required for LIMIT orders. Must match the market tick size.',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create', 'modify'],
						orderType: ['LIMIT'],
					},
				},
			},
			{
				displayName: 'Confirm High Value Order',
				name: 'confirmHighValueOrder',
				type: 'boolean',
				default: false,
				description: 'Whether to confirm orders worth KRW 100,000,000 or more',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['create', 'modify'],
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'OPEN',
					},
					{
						name: 'Closed',
						value: 'CLOSED',
					},
				],
				default: 'OPEN',
				displayOptions: {
					show: {
						resource: ['orderHistory'],
						operation: ['getMany'],
					},
				},
			},
			{
				displayName: 'Symbol',
				name: 'orderHistorySymbol',
				type: 'string',
				default: '',
				placeholder: 'AAPL',
				description: 'Optional symbol filter',
				displayOptions: {
					show: {
						resource: ['orderHistory'],
						operation: ['getMany'],
					},
				},
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: '2026-03-01',
				description: 'Optional inclusive order date from, KST, YYYY-MM-DD',
				displayOptions: {
					show: {
						resource: ['orderHistory'],
						operation: ['getMany'],
					},
				},
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '2026-03-31',
				description: 'Optional inclusive order date to, KST, YYYY-MM-DD',
				displayOptions: {
					show: {
						resource: ['orderHistory'],
						operation: ['getMany'],
					},
				},
			},
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor for CLOSED orders. Ignored for OPEN orders.',
				displayOptions: {
					show: {
						resource: ['orderHistory'],
						operation: ['getMany'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						resource: ['orderHistory'],
						operation: ['getMany'],
					},
				},
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'options',
				options: [
					{
						name: 'KRW',
						value: 'KRW',
					},
					{
						name: 'USD',
						value: 'USD',
					},
				],
				default: 'KRW',
				displayOptions: {
					show: {
						resource: ['orderInfo'],
						operation: ['getBuyingPower'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = (await this.getCredentials('tossInvestApi')) as TossCredentials;
		let accessToken: string | undefined;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				accessToken ??= await getAccessToken(this, credentials);

				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				let response: unknown;

				if (resource === 'account') {
					response = await tossInvestRequest(this, credentials, accessToken, 'GET', '/api/v1/accounts');
				}

				if (resource === 'asset') {
					const qs: IDataObject = {};
					addIfPresent(qs, 'symbol', this.getNodeParameter('symbol', itemIndex, '') as string);

					response = await tossInvestRequest(
						this,
						credentials,
						accessToken,
						'GET',
						'/api/v1/holdings',
						qs,
						undefined,
						resolveAccountSeq(this, credentials, itemIndex),
					);
				}

				if (resource === 'marketData') {
					if (operation === 'getCandles') {
						const qs: IDataObject = {
							symbol: this.getNodeParameter('symbol', itemIndex) as string,
							interval: this.getNodeParameter('interval', itemIndex) as string,
							count: this.getNodeParameter('count', itemIndex) as number,
							adjusted: this.getNodeParameter('adjusted', itemIndex) as boolean,
						};
						addIfPresent(qs, 'before', this.getNodeParameter('before', itemIndex, '') as string);

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							'/api/v1/candles',
							qs,
						);
					}

					if (operation === 'getOrderbook') {
						response = await tossInvestRequest(this, credentials, accessToken, 'GET', '/api/v1/orderbook', {
							symbol: this.getNodeParameter('symbol', itemIndex) as string,
						});
					}

					if (operation === 'getPriceLimits') {
						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							'/api/v1/price-limits',
							{ symbol: this.getNodeParameter('symbol', itemIndex) as string },
						);
					}

					if (operation === 'getPrices') {
						response = await tossInvestRequest(this, credentials, accessToken, 'GET', '/api/v1/prices', {
							symbols: this.getNodeParameter('symbols', itemIndex) as string,
						});
					}

					if (operation === 'getTrades') {
						response = await tossInvestRequest(this, credentials, accessToken, 'GET', '/api/v1/trades', {
							symbol: this.getNodeParameter('symbol', itemIndex) as string,
							count: this.getNodeParameter('tradeCount', itemIndex) as number,
						});
					}
				}

				if (resource === 'marketInfo') {
					if (operation === 'getExchangeRate') {
						const qs: IDataObject = {
							baseCurrency: this.getNodeParameter('baseCurrency', itemIndex) as string,
							quoteCurrency: this.getNodeParameter('quoteCurrency', itemIndex) as string,
						};
						addIfPresent(qs, 'dateTime', this.getNodeParameter('dateTime', itemIndex, '') as string);

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							'/api/v1/exchange-rate',
							qs,
						);
					}

					if (operation === 'getKrMarketCalendar' || operation === 'getUsMarketCalendar') {
						const qs: IDataObject = {};
						addIfPresent(qs, 'date', this.getNodeParameter('date', itemIndex, '') as string);
						const market = operation === 'getKrMarketCalendar' ? 'KR' : 'US';

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							`/api/v1/market-calendar/${market}`,
							qs,
						);
					}
				}

				if (resource === 'order') {
					const accountSeq = resolveAccountSeq(this, credentials, itemIndex);

					if (operation === 'create') {
						const orderMode = this.getNodeParameter('orderMode', itemIndex) as string;
						const body: IDataObject = {
							symbol: this.getNodeParameter('orderSymbol', itemIndex) as string,
							side: this.getNodeParameter('side', itemIndex) as string,
							confirmHighValueOrder: this.getNodeParameter('confirmHighValueOrder', itemIndex) as boolean,
						};
						addIfPresent(body, 'clientOrderId', this.getNodeParameter('clientOrderId', itemIndex, '') as string);

						if (orderMode === 'amount') {
							body.orderType = 'MARKET';
							body.orderAmount = this.getNodeParameter('orderAmount', itemIndex) as string;
						} else {
							body.orderType = this.getNodeParameter('orderType', itemIndex) as string;
							body.timeInForce = this.getNodeParameter('timeInForce', itemIndex) as string;
							body.quantity = this.getNodeParameter('quantity', itemIndex) as string;
							addIfPresent(body, 'price', this.getNodeParameter('price', itemIndex, '') as string);
						}

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'POST',
							'/api/v1/orders',
							{},
							body,
							accountSeq,
						);
					}

					if (operation === 'modify') {
						const orderId = this.getNodeParameter('orderId', itemIndex) as string;
						const body: IDataObject = {
							orderType: this.getNodeParameter('orderType', itemIndex) as string,
							confirmHighValueOrder: this.getNodeParameter('confirmHighValueOrder', itemIndex) as boolean,
						};
						addIfPresent(body, 'quantity', this.getNodeParameter('modifyQuantity', itemIndex, '') as string);
						addIfPresent(body, 'price', this.getNodeParameter('price', itemIndex, '') as string);

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'POST',
							`/api/v1/orders/${encodeURIComponent(orderId)}/modify`,
							{},
							body,
							accountSeq,
						);
					}

					if (operation === 'cancel') {
						const orderId = this.getNodeParameter('orderId', itemIndex) as string;

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'POST',
							`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`,
							{},
							{},
							accountSeq,
						);
					}
				}

				if (resource === 'orderHistory') {
					const accountSeq = resolveAccountSeq(this, credentials, itemIndex);

					if (operation === 'get') {
						const orderId = this.getNodeParameter('orderId', itemIndex) as string;

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							`/api/v1/orders/${encodeURIComponent(orderId)}`,
							{},
							undefined,
							accountSeq,
						);
					}

					if (operation === 'getMany') {
						const qs: IDataObject = {
							status: this.getNodeParameter('status', itemIndex) as string,
							limit: this.getNodeParameter('limit', itemIndex) as number,
						};
						addIfPresent(qs, 'symbol', this.getNodeParameter('orderHistorySymbol', itemIndex, '') as string);
						addIfPresent(qs, 'from', this.getNodeParameter('from', itemIndex, '') as string);
						addIfPresent(qs, 'to', this.getNodeParameter('to', itemIndex, '') as string);
						addIfPresent(qs, 'cursor', this.getNodeParameter('cursor', itemIndex, '') as string);

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							'/api/v1/orders',
							qs,
							undefined,
							accountSeq,
						);
					}
				}

				if (resource === 'orderInfo') {
					const accountSeq = resolveAccountSeq(this, credentials, itemIndex);

					if (operation === 'getBuyingPower') {
						response = await tossInvestRequest(this, credentials, accessToken, 'GET', '/api/v1/buying-power', {
							currency: this.getNodeParameter('currency', itemIndex) as string,
						}, undefined, accountSeq);
					}

					if (operation === 'getCommissions') {
						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							'/api/v1/commissions',
							{},
							undefined,
							accountSeq,
						);
					}

					if (operation === 'getSellableQuantity') {
						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							'/api/v1/sellable-quantity',
							{ symbol: this.getNodeParameter('symbol', itemIndex) as string },
							undefined,
							accountSeq,
						);
					}
				}

				if (resource === 'stockInfo') {
					if (operation === 'getStocks') {
						response = await tossInvestRequest(this, credentials, accessToken, 'GET', '/api/v1/stocks', {
							symbols: this.getNodeParameter('symbols', itemIndex) as string,
						});
					}

					if (operation === 'getWarnings') {
						const symbol = this.getNodeParameter('symbol', itemIndex) as string;

						response = await tossInvestRequest(
							this,
							credentials,
							accessToken,
							'GET',
							`/api/v1/stocks/${encodeURIComponent(symbol)}/warnings`,
						);
					}
				}

				if (response === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported Toss Invest operation: ${resource}.${operation}`,
						{ itemIndex },
					);
				}

				returnData.push({
					json: response as IDataObject,
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw error;
				}

				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}

		return [returnData];
	}
}
