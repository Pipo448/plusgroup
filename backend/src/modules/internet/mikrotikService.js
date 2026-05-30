const { RouterOSAPI } = require('node-routeros');

async function getMikrotikClient(config) {
  const conn = new RouterOSAPI({
    host: config.host,
    user: config.username,
    password: config.password,
    port: config.port || 8728,
  });
  await conn.connect();
  return conn;
}

async function getHotspotUser(config, username) {
  const client = await getMikrotikClient(config);
  const users = await client.write('/ip/hotspot/user/print', [
    '=.proplist=name,profile,uptime,bytes-in,bytes-out,limit-uptime,disabled',
    `?name=${username}`
  ]);
  await client.close();
  return users[0] || null;
}

async function getActiveSession(config, username) {
  const client = await getMikrotikClient(config);
  const sessions = await client.write('/ip/hotspot/active/print', [
    `?user=${username}`
  ]);
  await client.close();
  return sessions[0] || null;
}

async function renewClient(config, username, newProfile) {
  const client = await getMikrotikClient(config);
  const users = await client.write('/ip/hotspot/user/print', [`?name=${username}`]);
  if (!users.length) throw new Error('Kliyan pa jwenn nan Mikrotik');

  await client.write('/ip/hotspot/user/set', [
    `=.id=${users[0]['.id']}`,
    `=profile=${newProfile}`,
    `=limit-uptime=0`,
    `=disabled=no`
  ]);
  await client.close();
  return true;
}

async function disableClient(config, username) {
  const client = await getMikrotikClient(config);
  const users = await client.write('/ip/hotspot/user/print', [`?name=${username}`]);
  if (!users.length) throw new Error('Kliyan pa jwenn nan Mikrotik');

  await client.write('/ip/hotspot/user/set', [
    `=.id=${users[0]['.id']}`,
    `=disabled=yes`
  ]);
  await client.close();
  return true;
}

module.exports = { getHotspotUser, getActiveSession, renewClient, disableClient };