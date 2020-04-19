# Example lnurl server w/ exchange-rates, offline signing

This is an example lnurl server for node.js that can support offline devices capable of cryptographically signing URLs. It uses custom middleware to convert fiat amounts to satoshis on-the-fly. A helper script is included to generate signed LNURLs for manual testing.


## Setup

Install dependencies:
```bash
npm install
```

Create a copy of the included config-example.json file:
```bash
cp ./config-example.json ./config.json
```

Change the lightning-backend options so that you can connect to your own node. Look for the following section:
```json
{
	"lightning": {
		"backend": "lnd",
		"config": {
			"cert": "/path/to/lnd/tls.cert",
			"macaroon": "/path/to/lnd/admin.macaroon",
			"hostname": "127.0.0.1:10009"
		}
	}
}
```
Currently only lnd is supported.

Generate a new API key:
```bash
npm run generate-api-key
```

Replace the new API key into your config.json file:
```json
	"auth": {
		"apiKeys": [
			{
				"id": "YOUR_KEY_ID",
				"key": "YOUR_KEY_SECRET"
			}
		]
	},
```

Start the lnurl server:
```bash
npm start
```

Generate a signed lnurl:
```bash
npm run --silent generate-signed-lnurl "EUR" "0.05"
```
Example output:
```
http://127.0.0.1:3000/lnurl?id=Ggx0Pz0%3D&n=e86d91cf28b6012a&tag=withdrawRequest&fiatSymbol=EUR&minWithdrawable=0.05&maxWithdrawable=0.05&defaultDescription=&s=08bf0cb7004204942963ec0572a9e17e43559f0216285e5b7cf8ca0cf9e0cf41
```
* `id` - the ID of the offline app's API key
* `n` - randomly generated nonce
* `s` - the signature created from the URL's querystring and the offline app's API key
* `tag` - the lnurl subprotocol to use ("withdrawRequest" in this case)
* `minWithdrawable` - the minimum amount that can be withdrawn by the user's wallet app
* `maxWithdrawable` - the maximum amount that can be withdrawn by the user's wallet app
* `fiatSymbol` - the fiat currency symbol that the server will use to convert the min/maxWithdrawable amounts to millisatoshis
* `defaultDescription` - the default value of the "memo" field for invoices generated by the user's wallet app

Open your browser and navigate to the URL that was created (yours, not the one here).

You should see something like this:
```json
{"minWithdrawable":635000,"maxWithdrawable":635000,"defaultDescription":"","callback":"http://127.0.0.1:3000/lnurl","k1":"69bdcc40d516e1080092e1419a7c9dbad345fe6f341e9312a9540e7fd78c5823","tag":"withdrawRequest"}
```
* Note that the min/maxWithdrawable amounts have been converted to millisatoshis
* `k1` - a short-lived secret that the user's lnurl-supporting wallet will send back to the server in order to complete the withdrawal process


## License

This software is [MIT licensed](https://tldrlegal.com/license/mit-license):
> A short, permissive software license. Basically, you can do whatever you want as long as you include the original copyright and license notice in any copy of the software/source.  There are many variations of this license in use.