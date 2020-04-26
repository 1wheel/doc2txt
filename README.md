# doc2txt

Save a [Google Doc](https://docs.google.com/document/d/1StMiAtcY6bY6yEIQp5pVSGdIHSnZG-kFspdmsSzAJdE/edit) as a txt file.

```bash
npx doc2txt 1StMiAtcY6bY6yEIQp5pVSGdIHSnZG-kFspdmsSzAJdE --outpath gettysburg.txt
```

## Installation 

```bash
npm install -g doc2txt
```

You'll also need to click the ["Enable the Google Docs API"](https://developers.google.com/docs/api/quickstart/nodejs) button and save the JSON file to `~/.doc2txt-credentials.json`.

The first time you run `doc2txt` you'll be prompted for an authorization token. Follow the CLI instructions to complete the OAuth ceremony.

## Node

Requiring doc2txt and processing the text also works: 

```js
const doc2txt = require('doc2txt');
const piglatin = require('pig-latin');

async function main(){
  const str = await doc2txt('1StMiAtcY6bY6yEIQp5pVSGdIHSnZG-kFspdmsSzAJdE');

  console.log(piglatin(str)); // Ourfay orescay andway evensay earsyay agoway...
}
main().catch(console.error);
```

## Options 

These can be configured with CLI flags: 

```bash
doc2txt abc123 --tokenpath my-token.json
``` 

or passed in as an object:

```js
doc2txt('abc123', {tokenPath: 'my-token.json'})
```

- **credpath** Location of the credentials JSON file. Defaults to `process.env.HOME + '/.doc2txt-credentials.json'`
- **tokenpath** Location of the token JSON file. Defaults to `process.env.HOME + '/.doc2txt-token.json'`
- **startstr** Text before this in the doc is removed. Defaults to `::start-str::`.
- **endStr** Text after this in the doc is removed. Defaults to `::end-str::`.




**This is not an officially supported Google product**