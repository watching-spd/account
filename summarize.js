const fs = require('fs-extra')
const fetch = require('node-fetch')
const { getMetadata } = require('./index')
const jsdom = require("jsdom");
const { JSDOM } = jsdom;


// So, this uses this dataset: https://data.seattle.gov/Public-Safety/Office-of-Police-Accountability-Complaints/99yi-dthu
// It's very different than the 2019-2020 closed case summary dataset, and actually, probably better
// Definitely richer
async function extractMetadata() {
  let summaries = await getMetadata('99yi-dthu')
  /*
  summaries = summaries.map((summary) => {
    return {
      postedDate: summary.posted_date,
      url: summary.case.url,
      description: summary.case.description,
      disposition: summary.disposition
    }
  })
  */
  fs.writeFileSync('./summaries/overview.json', JSON.stringify(summaries, null, 2))
}

function nameFromAnchor(anchor) {
  let name = anchor.textContent.trim()
  if (/^\d{4}-\d{4}$/.test(name)) {
    name = name.split('-')[0] + 'OPA-' + name.split('-')[1]
  }
  return name
}

async function caseNameToUrl() {
  const url = 'http://www.seattle.gov/opa/news-and-reports/closed-case-summaries'
  const dom = new JSDOM(await fetch(url).then((res => res.text())))
  let anchors = dom.window.document.querySelectorAll('a[href^="Documents/Departments/OPA/ClosedCaseSummaries/"]')
  anchors = Array.from(anchors).map((anchor => nameFromAnchor(anchor) + ', ' + anchor.href.trim()))
  fs.writeFileSync('./summaries/overview.json', anchors.join(',\n'))
}

caseNameToUrl()
