#!/usr/bin/env node

/* Copyright 2020 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License')
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

var { promises: fs, existsSync, readFileSync, writeFileSync } = require('fs')
var readline = require('readline')
var {google} = require('googleapis')
var {promisify} = require('util')


module.exports = async function(docId, options={}){
  var defaultOptions = {
    credpath: process.env.HOME + '/.doc2txt-credentials.json',
    tokenpath: process.env.HOME + '/.doc2txt-token.json',
    startstr: '::start-str::',
    endstr: '::end-str::',
    cachepath: '',
    fmt: '',
    // docId: '1StMiAtcY6bY6yEIQp5pVSGdIHSnZG-kFspdmsSzAJdE',
  }

  var opts = Object.assign(defaultOptions, options)
  if (!opts.fmt && opts.outpath && opts.outpath.includes('.md')) opts.fmt = 'md'

  if (opts.cache && existsSync(opts.cache)){
    var res = JSON.parse(readFileSync(opts.cache))
  } else {
    var auth = await promisify(generateAuth)()
    var docs = google.docs({version: 'v1', auth})
    var res = await docs.documents.get({documentId: docId || opts.docId})

    if (opts.cache){
      writeFileSync(opts.cache, JSON.stringify(res, null, 2))
    }
  }

  var out = res.data.body.content
    .map(d => d.paragraph)
    .filter(d => d)
    .map(d => d.elements.map(extractElement).join(''))
    .join('')
    .split(opts.endstr)[0]

  if (out.includes(opts.startstr)) out = out.split(opts.startstr)[1]
  out = out.trim()

  // Write out to opts.outpath if the file has changed
  if (opts.outpath){
    try {
      var prev = await fs.readFile(opts.outpath, 'utf8')
    } catch (e) {} 
    if (out !== prev){
      await fs.writeFile(opts.outpath, out)
      console.log('updated', opts.outpath, new Date())
    }
  }

  return out

  function extractElement(e){
    var str = e.textRun.content

    if (opts.fmt != 'md' || !str.trim()) return str

    var {italic, bold, link} = e.textRun.textStyle

    if (!italic && !bold && !link || str == '\n') return str

    var lSpace = ''
    var rSpace = ''
    if (str[0] == ' '){
      lSpace = ' '
      str = str.slice(1)
    }
    if (str[str.length - 1] == ' '){
      rSpace = ' '
      str = str.slice(0, -1)
    }

    if (italic) str = '*' + str + '*'
    if (bold) str = '**' + str + '**'
    if (link) str = `[${str}](${link.url})`

    return lSpace + str + rSpace
  }

  async function generateAuth(cb){
    // Load client secrets from a local file.
    let oAuth2Client
    try{
      var credentials = JSON.parse(await fs.readFile(opts.credpath, 'utf8'))
      var {client_secret, client_id, redirect_uris} = credentials.installed
      oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    } catch(e){
      return cb(`
        ${e}
        Missing or invalid ${opts.credpath}.
        Generate JSON with 'Enable the Google Docs API' here: 
        https://developers.google.com/docs/api/quickstart/nodejs
      `)
    }

    if (existsSync(opts.tokenpath)){
      var token = JSON.parse(await fs.readFile(opts.tokenpath, 'utf8'))
      oAuth2Client.setCredentials(token)
      cb(null, oAuth2Client)
    } else {
      // If not, download a new token
      var authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/documents.readonly'],
      })
      console.error('Authorize this app by visiting this url:', authUrl)
      
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close()
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return cb('Error retrieving access token ' +  err)
          oAuth2Client.setCredentials(token)
          cb(null, oAuth2Client)

          // Store the token to disk for later program executions
          fs.writeFile(opts.tokenpath, JSON.stringify(token))
        })
      })
    }
  }


}

if (require.main === module) runCLI()
async function runCLI(){
  var argv = require('minimist')(process.argv.slice(2))
  argv.id = argv.id || argv._[0]

  var out = await module.exports(argv.id, argv).catch(console.error)
  if (!argv.outpath) console.log(out)
}




