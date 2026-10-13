import net from 'node:net';import dns from 'node:dns';import http from 'node:http';import https from 'node:https';import tls from 'node:tls';import dgram from 'node:dgram';import childProcess from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';import {writeFileSync} from 'node:fs';
let attempts=0;const blocked=()=>{attempts++;throw new Error('OFFLINE_API_BLOCKED');};
globalThis.fetch=blocked;
for(const [object,names]of [[net,['connect','createConnection']],[net.Socket.prototype,['connect']],[dns,['lookup','resolve','resolve4','resolve6','reverse']],[dns.promises,['lookup','resolve','resolve4','resolve6','reverse']],[http,['request','get']],[https,['request','get']],[tls,['connect']],[dgram,['createSocket']]])for(const name of names)object[name]=blocked;
if(process.env.ROE_OFFLINE_ALLOW_LOCAL_PROCESS!=='1')for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])childProcess[name]=blocked;
syncBuiltinESMExports();
process.on('exit',()=>{if(process.env.ROE_OFFLINE_RECEIPT)writeFileSync(process.env.ROE_OFFLINE_RECEIPT,String(attempts));});
