var fs = require('fs')
var doc2txt = require('../index.js')

var cachepath = __dirname + '/link-fmt.json'
// fs.unlinkSync(cachepath)

async function main(){
  var opts = {
    startstr: '::startpost::',
    endstr: '::end-post::',
    credpath: '~/.ssh/credentials.json',
    fmt: 'md',
    cachepath,
  }
  var docstr = await doc2txt('1DfhESA2QilX_tdRAl9sCURkHCxmPOFEVwrzRLB1nBBE', opts)

  console.log(docstr)
}
main().catch(console.error)
