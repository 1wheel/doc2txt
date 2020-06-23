#!/usr/bin/env node

/* Copyright 2020 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

var { promises: fs } = require("fs");
var readline = require('readline');
var {google} = require('googleapis');
var {promisify} = require('util');

var opts = {
  credpath: process.env.HOME + '/.doc2txt-credentials.json',
  tokenpath: process.env.HOME + '/.doc2txt-token.json',
  startstr: '::start-str::',
  endstr: '::end-str::'
  // docId: '1StMiAtcY6bY6yEIQp5pVSGdIHSnZG-kFspdmsSzAJdE',
};

module.exports = async function(documentId, opts={}){
  var auth = await promisify(generateAuth)();
  var docs = google.docs({version: 'v1', auth});
  var res = await docs.documents.get({documentId});

  var out = res.data.body.content
    .map(d => d.paragraph)
    .filter(d => d)
    .map(d => d.elements[0].textRun.content)
    .join('')
    .split(opts.endstr)[0]

  if (out.includes(opts.startstr)) out = out.split(opts.startstr)[1]
  out = out.trim()

  // Write out to opts.outpath if the file has changed
  if (opts.outpath){
    try {
      var prev = await fs.readFile(opts.outpath, 'utf8');
    } catch (e) {} 
    if (out !== prev){
      await fs.writeFile(opts.outpath, out);
      console.log('updated', opts.outpath, new Date());
    }
  }

  return out
}

if (require.main === module) runCLI();
async function runCLI(){
  var argv = require('minimist')(process.argv.slice(2));
  argv.id = argv.id || argv._[0];
  Object.assign(opts, argv);

  var out = await module.exports(opts.id, opts).catch(console.error);
  if (!opts.outpath) console.log(out);
}


async function generateAuth(cb){
  // Load client secrets from a local file.
  let oAuth2Client;
  try{
    var credentials = JSON.parse(await fs.readFile(opts.credpath, 'utf8'));
    var {client_secret, client_id, redirect_uris} = credentials.installed;
    oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  } catch(e){
    return cb(`
      ${e}
      Missing or invalid ${opts.credpath}.
      Generate JSON with "Enable the Google Docs API" here: 
      https://developers.google.com/docs/api/quickstart/nodejs
    `)
  }

  try {
    // Check if we have previously stored a token.
    var token = JSON.parse(await fs.readFile(opts.tokenpath, 'utf8'));
    oAuth2Client.setCredentials(token)
    cb(null, oAuth2Client);
  } catch (e){
    // If not, download a new token
    var authUrl = oAuth22Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/documents.readonly'],
    });
    console.error('Authorize this app by visiting this url:', authUrl);
    
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return cb('Error retrieving access token ' +  err);
        oAuth2Client.setCredentials(token);
        cb(null, oAuth2Client);

        // Store the token to disk for later program executions
        fs.writeFile(opts.tokenpath, JSON.stringify(token))
      });
    });
  }
}



