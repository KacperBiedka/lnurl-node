const _ = require('underscore');
const { expect } = require('chai');
const {
	createSignature,
	prepareSignedQuery
} = require('../../../lib');
const querystring = require('querystring');

describe('prepareSignedQuery(apiKey, tag, params[, options])', function() {

	it('is a function', function() {
		expect(prepareSignedQuery).to.be.a('function');
	});

	const validArgs = {
		apiKey: {
			id: 'b6cb8e81e3',
			key: '74a8f70391e48b7a35c676e5e448eda034db88c654213feff7b80228dcad7fa0',
		},
		tag: 'withdrawRequest',
		params: {
			minWithdrawable: 50000,
			maxWithdrawable: 60000,
			defaultDescription: '',
		},
		options: {
			algorithm: 'sha256',
			nonceBytes: 10,
		},
	};

	const tests = [
		{
			description: 'valid arguments',
			args: validArgs,
			expected: function(result) {
				const { id, key } = validArgs.apiKey;
				const { tag, params } = validArgs;
				expect(result).to.be.an('object');
				expect(result.id).to.equal(id);
				expect(result.tag).to.equal(tag);
				expect(result.minWithdrawable).to.equal(params.minWithdrawable);
				expect(result.maxWithdrawable).to.equal(params.maxWithdrawable);
				expect(result.defaultDescription).to.equal(params.defaultDescription);
				expect(result.nonce).to.have.length(20);
				expect(result.signature).to.have.length(64);
				const payload = querystring.stringify({
					id,
					nonce: result.nonce,
					tag,
					minWithdrawable: params.minWithdrawable,
					maxWithdrawable: params.maxWithdrawable,
					defaultDescription: params.defaultDescription,
				});
				const signature = createSignature(payload, key, validArgs.options.algorithm);
				expect(result.signature).to.equal(signature);
			},
		},
		{
			description: '{ options: { algorithm: "sha512" }',
			args: _.extend({}, validArgs, {
				options: {
					algorithm: 'sha512',
				},
			}),
			expected: function(result) {
				const { id, key } = validArgs.apiKey;
				const { tag, params } = validArgs;
				expect(result).to.be.an('object');
				expect(result.signature).to.have.length(128);
				const payload = querystring.stringify({
					id,
					nonce: result.nonce,
					tag,
					minWithdrawable: params.minWithdrawable,
					maxWithdrawable: params.maxWithdrawable,
					defaultDescription: params.defaultDescription,
				});
				const signature = createSignature(payload, key, 'sha512');
				expect(result.signature).to.equal(signature);
			},
		},
		{
			description: '{ options: { nonceBytes: 8 }',
			args: _.extend({}, validArgs, {
				options: {
					nonceBytes: 8,
				},
			}),
			expected: function(result) {
				expect(result).to.be.an('object');
				expect(result.nonce).to.have.length(16);
			},
		},
		{
			description: '{ options: { shorten: true }',
			args: _.extend({}, validArgs, {
				options: {
					shorten: true,
				},
			}),
			expected: function(result) {
				const { id, key } = validArgs.apiKey;
				const { tag, params } = validArgs;
				expect(result).to.be.an('object');
				expect(result.id).to.equal(id);
				expect(result.t).to.equal('w');
				expect(result.pn).to.equal('5e4');
				expect(result.px).to.equal('6e4');
				expect(result.pd).to.equal(params.defaultDescription);
				expect(result.n).to.have.length(20);
				expect(result.s).to.have.length(64);
				expect(result.tag).to.be.undefined;
				expect(result.minWithdrawable).to.be.undefined;
				expect(result.maxWithdrawable).to.be.undefined;
				expect(result.defaultDescription).to.be.undefined;
				expect(result.nonce).to.be.undefined;
				expect(result.signature).to.be.undefined;
			},
		},
		{
			description: 'invalid apiKey',
			args: _.extend({}, validArgs, {
				apiKey: 1,
			}),
			expectThrownError: 'Invalid argument ("apiKey"): Object expected',
		},
		{
			description: 'missing apiKey.id',
			args: _.extend({}, validArgs, {
				apiKey: _.omit(validArgs.apiKey, 'id'),
			}),
			expectThrownError: 'Missing "apiKey.id"',
		},
		{
			description: 'missing apiKey.key',
			args: _.extend({}, validArgs, {
				apiKey: _.omit(validArgs.apiKey, 'key'),
			}),
			expectThrownError: 'Missing "apiKey.key"',
		},
		{
			description: 'invalid tag',
			args: _.extend({}, validArgs, {
				tag: false,
			}),
			expectThrownError: 'Invalid argument ("tag"): String expected',
		},
		{
			description: 'invalid params',
			args: _.extend({}, validArgs, {
				params: 1,
			}),
			expectThrownError: 'Invalid argument ("params"): Object expected',
		},
	];

	_.each(['apiKey', 'tag'], function(argName) {
		tests.push({
			description: `missing required argument "${argName}"`,
			args: _.omit(validArgs, argName),
			expectThrownError: `Missing required argument: "${argName}"`,
		});
	});

	_.each(tests, function(test) {
		const { apiKey, tag, params, options } = test.args;
		let description = test.description || JSON.stringify(test.args);
		it(description, function() {
			let result;
			let thrownError;
			try {
				result = prepareSignedQuery(apiKey, tag, params, options);
			} catch (error) {
				thrownError = error;
			}
			if (!_.isUndefined(thrownError)) {
				// An error was thrown.
				if (test.expectThrownError) {
					// Check if the thrown error message matches what as expected.
					expect(thrownError.message).to.equal(test.expectThrownError);
				} else {
					// Rethrow because an error wasn't expected.
					throw thrownError;
				}
			} else if (test.expectThrownError) {
				throw new Error(`Expected error to be thrown: '${test.expectThrownError}'`);
			}
			if (_.isFunction(test.expected)) {
				test.expected.call(this, result, thrownError);
			} else {
				expect(result).to.deep.equal(test.expected);
			}
		});
	});
});