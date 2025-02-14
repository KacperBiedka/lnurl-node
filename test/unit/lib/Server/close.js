const _ = require('underscore');
const async = require('async');
const { expect } = require('chai');
const lnurl = require('../../../../');
const helpers = require('../../../helpers');
const http = require('http');
const url = require('url');

describe('close([options])', function() {

	let server;
	beforeEach(function(done) {
		server = this.helpers.createServer();
		server.once('listening', done);
		server.once('error', done);
	});

	afterEach(function() {
		if (server) return server.close();
	});

	describe('force', function() {

		beforeEach(function(done) {
			const numSockets = 3;
			async.times(numSockets, (index, next) => {
				const parsedUrl = url.parse(`http://${server.options.host}:${server.options.port}/status`);
				const req = http.request({
					agent: new http.Agent({
						keepAlive: true,
						// Infinity is read as 50 sockets:
						maxSockets: Infinity
					}),
					method: 'GET',
					hostname: parsedUrl.hostname,
					port: parsedUrl.port,
					path: parsedUrl.path,
				}, function(res) {
					next();
				});
				req.once('error', next);
				req.end();
			}, done);
		});

		describe('true', function() {

			it('force-closes all sockets', function() {
				return server.close({ force: true }).then(() => {
					_.each(server.sockets, socket => {
						expect(socket).to.equal(null);
					});
				});
			});
		});

		describe('false', function() {

			it('does not force-close all sockets', function() {
				return server.close({ force: false }).then(() => {
					_.each(server.sockets, socket => {
						expect(socket).to.not.equal(null);
					});
				});
			});
		});
	});

	describe('store', function() {

		describe('true', function() {

			it('closes the data store', function() {
				return server.close({ store: true }).then(() => {
					expect(server.store).to.equal(null);
				});
			});
		});

		describe('false', function() {

			it('does not close the data store', function() {
				return server.close({ store: false }).then(() => {
					expect(server.store).to.not.equal(null);
				});
			});
		});
	});
});
