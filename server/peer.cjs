// SPDX-License-Identifier: AGPL-3.0-only
// Signaling only; private loopback bind, no discovery, no application payload storage.
const {PeerServer}=require('peer');
PeerServer({host:'127.0.0.1',port:Number(process.env.PORT||8792),path:'/peer',key:'aurea',proxied:true,allow_discovery:false,concurrent_limit:100,expire_timeout:30000});
