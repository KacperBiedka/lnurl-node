const _ = require('underscore');
const { expect } = require('chai');
const { generateApiKey } = require('../../../../lib');
const helpers = require('../../../helpers');
const path = require('path');

describe('Server: events', function() {

	describe('subprotocols', function() {

		const { validParams } = helpers.fixtures;

		let server;
		let apiKeyAlwaysFail, apiKeyAlwaysSucceed;
		beforeEach(function() {
			apiKeyAlwaysFail = _.extend({}, generateApiKey(), {
				lightning: {
					backend: 'dummy',
					config: { alwaysFail: true },
				},
			});
			apiKeyAlwaysSucceed = _.extend({}, generateApiKey(), {
				lightning: {
					backend: 'dummy',
					config: {},
				},
			});
			server = helpers.createServer({
				listen: false,
				auth: {
					apiKeys: [
						apiKeyAlwaysFail,
						apiKeyAlwaysSucceed,
					],
				},
				lightning: null,
			});
		});

		afterEach(function() {
			if (server) return server.close();
		});

		describe('login', function() {

			let secret;
			beforeEach(function() {
				secret = null;
				return server.generateNewUrl('login', {}).then(result => {
					secret = result.secret;
				});
			});

			it('successful login', function() {
				const params = validParams.action.login(secret);
				let calls = 0;
				server.once('login', function(event) {
					calls++;
					expect(event).to.be.an('object');
					expect(event.key).to.be.a('string');
					expect(event.hash).to.be.a('string');
				});
				return server.runSubProtocol('login', 'action', secret, params).then(() => {
					expect(calls).to.equal(1);
				});
			});
		});

		_.each(['channelRequest', 'payRequest', 'withdrawRequest'], function(tag) {

			describe(tag, function() {

				let newUrl, createParams;
				beforeEach(function() {
					newUrl = null;
					createParams = validParams.create[tag];
					return server.generateNewUrl(tag, createParams).then(result => {
						newUrl = result;
					});
				});

				it(`${tag}:action:processed`, function() {
					let calls = 0;
					const actionParams = validParams.action[tag];
					const combinedParams = _.extend({}, actionParams, createParams);
					let events = [];
					server.on(`${tag}:action:processed`, function(event) {
						events.push(event);
					});
					return server.runSubProtocol(tag, 'action', newUrl.secret, combinedParams, apiKeyAlwaysSucceed.id).then(() => {
						expect(events).to.have.length(1);
						_.each(events, event => {
							expect(event).to.be.an('object');
							expect(event.secret).to.equal(newUrl.secret);
							expect(event.params).to.deep.equal(combinedParams);
							expect(event.result).to.be.an('object');
							switch (tag) {
								case 'channelRequest':
									expect(event.result).to.deep.equal({});
									break;
								case 'payRequest':
									expect(event.result.id).to.equal(null);
									expect(event.result.invoice).to.be.a('string');
									break;
								case 'withdrawRequest':
									expect(event.result.id).to.equal(null);
									break;
							}
						});
					});
				});

				const tagToLightningBackendMethod = {
					channelRequest: 'openChannel',
					payRequest: 'addInvoice',
					withdrawRequest: 'payInvoice',
				};

				it(`${tag}:action:failed`, function() {
					let calls = 0;
					const actionParams = validParams.action[tag];
					const combinedParams = _.extend({}, actionParams, createParams);
					const backendMethod = tagToLightningBackendMethod[tag];
					let events = [];
					server.on(`${tag}:action:failed`, function(event) {
						events.push(event);
					});
					return server.runSubProtocol(tag, 'action', newUrl.secret, combinedParams, apiKeyAlwaysFail.id).then(() => {
						throw new Error('Should not have been executed');
					}).catch(error => {
						expect(error.message).to.equal(`${backendMethod} failure`);
						_.each(events, event => {
							expect(event).to.be.an('object');
							expect(event.secret).to.be.a('string');
							expect(event.params).to.be.an('object');
							expect(event.error instanceof Error).to.equal(true);
							expect(event.error.message).to.equal(`${backendMethod} failure`);
						});
					});
				});
			});
		});
	});
});
