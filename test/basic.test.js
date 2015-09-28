// Copyright 2015 Joyent, Inc.  All rights reserved.

var test = require('tape').test;

var Agent = require('./ssh-agent-ctl');
var sshpk = require('sshpk');
var path = require('path');

var sshpkAgent = require('../lib/index');

var agent;
var testDir = __dirname;

var ID_RSA_FP = sshpk.parseFingerprint(
    'SHA256:tT5wcGMJkBzNu+OoJYEgDCwIcDAIFCUahAmuTT4qC3s');
var ID_ECDSA_FP = sshpk.parseFingerprint(
    'SHA256:e34c67Npv31uMtfVUEBJln5aOcJugzDaYGsj1Uph5DE');

test('setup', function (t) {
	delete (process.env['SSH_AGENT_PID']);
	delete (process.env['SSH_AUTH_SOCK']);
	t.end();
});

test('AgentClient throws with no socket', function (t) {
	t.throws(function () {
		new sshpkAgent.AgentClient();
	});
	t.end();
});

test('agent setup', function (t) {
	agent = new Agent();
	agent.on('open', function () {
		t.end();
	});
	agent.on('error', function (err) {
		console.log(err);
		agent = undefined;
		t.end();
	});
});

test('AgentClient takes path to socket in constructor', function (t) {
	var c = new sshpkAgent.AgentClient({
		socketPath: agent.env['SSH_AUTH_SOCK']
	});
	t.ok(c);
	t.end();
});

test('AgentClient takes path to socket from environment', function (t) {
	agent.importEnv();
	var c = new sshpkAgent.AgentClient();
	t.ok(c);
	t.end();
});

test('AgentClient can connect', function (t) {
	var c = new sshpkAgent.AgentClient();
	c.connect(function () {
		t.ok(c);
		t.strictEqual(c.state, 'connected');
		t.end();
	});
});

test('AgentClient can list keys when empty', function (t) {
	var c = new sshpkAgent.AgentClient();
	c.listKeys(function (err, keys) {
		t.error(err);
		t.ok(keys instanceof Array);
		t.equal(keys.length, 0);
		t.end();
	});
});

test('AgentClient can list keys with one key loaded', function (t) {
	var c = new sshpkAgent.AgentClient();
	agent.addKey(path.join(testDir, 'id_rsa'), function (err) {
		t.error(err);
		c.listKeys(function (err, keys) {
			t.error(err);
			t.ok(keys instanceof Array);
			t.equal(keys.length, 1);

			t.ok(keys[0] instanceof sshpk.Key);
			t.strictEqual(keys[0].type, 'rsa');
			t.strictEqual(keys[0].size, 1024);
			t.ok(ID_RSA_FP.matches(keys[0]));
			t.end();
		});
	});
});

test('AgentClient can list multiple keys', function (t) {
	var c = new sshpkAgent.AgentClient();
	agent.addKey(path.join(testDir, 'id_ecdsa'), function (err) {
		t.error(err);
		c.listKeys(function (err, keys) {
			t.error(err);
			t.ok(keys instanceof Array);
			t.equal(keys.length, 2);

			t.ok(keys[1] instanceof sshpk.Key);
			t.strictEqual(keys[1].type, 'ecdsa');
			t.ok(ID_ECDSA_FP.matches(keys[1]));
			t.end();
		})
	});
});

test('AgentClient can re-use connection', function (t) {
	var c = new sshpkAgent.AgentClient();
	c.listKeys(function (err, keys) {
		t.error(err);
		t.strictEqual(c.state, 'connected');
		c.listKeys(function (err2, keys2) {
			t.error(err2);
			t.end();
		});
	})
});

test('AgentClient queues up requests', function (t) {
	var c = new sshpkAgent.AgentClient();
	var n = 0;

	function callback(err, keys) {
		t.error(err);
		if (++n >= 10)
			t.end();
	}

	for (var i = 0; i < 10; ++i)
		c.listKeys(callback);
});

test('agent teardown', function (t) {
    t.ok(agent);
    agent.close(function () {
        t.end();
    });
});
