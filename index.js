const fetch = require('node-fetch')
const fs = require('fs-extra')
const { PdfReader } = require('pdfreader')

const getMetadata = async (dataSetId) => {
  // why this URL? no clue; I found it by watching the network requests this page makes:
  // http://www.seattle.gov/opa/news-and-reports/closed-case-summaries#2020present
  const url = `https://data.seattle.gov/resource/${dataSetId}.json`
  return fetch(url).then(res => res.json())
}

async function fetchPDF(summary) {
  return fetch(summary.case.url).then(res => {
    const dest = fs.createWriteStream(`./summaries/pdf/${summary.case.description}.pdf`)
    res.body.pipe(dest)
  })
}

async function saveEach() {
  const summaries = await getMetadata('f8kp-sfr3')
  const promises = []

  summaries.forEach((summary) => {
    promises.push(fetchPDF(summary))
  })

  return Promise.all(promises)
}

function cleanUp(text) {
  const regexs = [
    // bottom-right footer
    /Page *\d+ *of *\d+/g,
    // bottom-left footer
    /v.20[1,2]\d\d{4}/g,
    // top header
    /Seattle\s+Office\s+of\s+Police\s+Accountability.*\s+OPA C\s+ASE\s+NUMBER:20[1,2]\dOPA-\d{4}/g
  ]
  for (i = 0; i < regexs.length; i++) {
    text = text.replace(regexs[i], '')
  }
  return text
}

async function parsePdf(name) {
  let text = ''
  let prev

  return new Promise((resolve, reject) => {
    new PdfReader().parseFileItems(`./summaries/pdf/${name}`, function(err, item) {
      if (err) reject(err)
      else if (!item) {
        text = cleanUp(text)
        resolve({ text, name })
      } else if (item.text) {
        if (item && prev && item.y - prev.y > .841) {
          if (item.y - prev.y > 1.5) text += '\n'
          // if (item.y - prev.y > 2) text += '\n'
          text += '\n'
        }
        text += item.text
        prev = item
      }
    })
  })
}

async function writeText(parsed) {
  parsed = await parsed
  return fs.writeFile(`./summaries/txt/${parsed.name.replace(/\.pdf$/, '.txt')}`, parsed.text)
}

async function transcribePdfs() {
  const promises = []
  const fileNames = (await fs.readdir('./summaries/pdf')).filter((fileName) => /\.pdf$/.test(fileName))
  fileNames.forEach((fileName) => promises.push(writeText(parsePdf(fileName))))
  const res = await Promise.all(promises)
}

// update and transcribe
// saveEach().then(() => transcribePdfs())

// transcribe only
// transcribePdfs()

module.exports = exports = {
  getMetadata
}
