import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class TossInvestApi implements ICredentialType {
	name = 'tossInvestApi';

	displayName = 'Toss Invest API';

	icon: Icon = 'file:../nodes/TossInvest/tossinvest.svg';

	documentationUrl = 'https://developers.tossinvest.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Default Account Sequence',
			name: 'accountSeq',
			type: 'string',
			default: '',
			description:
				'Optional accountSeq value from Account > Get Many. Required by holdings, order, and order info APIs unless supplied on the node.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://openapi.tossinvest.com',
			description: 'Toss Securities Open API base URL.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			baseURL: '={{$credentials.baseUrl}}',
			url: '/oauth2/token',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: '={{"grant_type=client_credentials&client_id=" + encodeURIComponent($credentials.clientId) + "&client_secret=" + encodeURIComponent($credentials.clientSecret)}}',
		},
	};
}
