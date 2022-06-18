const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./client_secret.json');
const puppeteer = require('puppeteer');
let cell = undefined
let sheet = undefined
let workingCellNum = undefined
let browser = undefined
async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight - window.innerHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}
async function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}

let fillData = {}

// spreadsheet key is the long id in the sheets URL
const doc = new GoogleSpreadsheet('1LGlPyxffpnrAfFUP4HNzV2JQK48MVFRKmGhJKISfR5U');

async function Start() {
  await doc.useServiceAccountAuth({
    client_email: creds.client_email,
    private_key: creds.private_key,
  });

await doc.loadInfo(); // loads document properties and worksheets
console.log(doc.title);

     sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
await sheet.loadCells('A1:J36'); // loads range of cells into local cache - DOES NOT RETURN THE CELLS


for (let index = 1; index < sheet.cellStats.total/29 ; index++) {

cell = sheet.getCell(index, 9)
if (cell.value == "ongoing") {
console.log("found")
workingCellNum = index
            
const rows = await sheet.getRows(); // can pass in { limit, offset }

fillData["WTP"] = rows[index-1]._rawData[1];
fillData["Domain"] = rows[index-1]._rawData[3];
fillData["URLL"] = rows[index-1]._rawData[4];
fillData["category"] = rows[index-1]._rawData[5];
fillData["Title"] = rows[index-1]._rawData[6]
fillData["Description"] = rows[index-1]._rawData[7]
fillData["Email"] = rows[index-1]._rawData[8]

console.log(fillData)

// Puppteer code
console.log("scrape");
await scrape()
console.log("done");


}else if(cell.value == "complete"){
    continue
    }else{
        break
        }    
    }
}


async function scrape() {

    const scraperPromise = new Promise((resolve , reject) =>{


        (async () => {    
            browser = await puppeteer.launch({ 
               headless: false,
               args:[
                       '--start-maximized' // you can also use '--start-fullscreen'
                   ]
           });    
       const page = await browser.newPage();
       await page.setViewport({ width: 2133, height: 1076});
          
       await page.goto('https://www.webwiki.com/info/add-website.html', {waitUntil: 'networkidle2'});
       await page.waitForTimeout(500)
    
       await page.waitForSelector('#domaincol > input');
       await page.type('#domaincol > input', fillData.Domain);
       await page.waitForTimeout(500)
    
       await page.waitForSelector('#urlcol > input');
       await page.type('#urlcol > input', fillData.URLL);
       await page.waitForTimeout(500)       
       const cat = fillData.category
       await page.evaluate((cat) => {
           
           const categoryObj = {
               "Art and culture":1,
               "Blogs":2,
               "Computer and Technology":3,
               "Economy and Business": 4,
               "Education and Career": 5,
               "Finances": 6,
               "Fun and Games":7,
               "Healthcare":8,
               "Local":9,
               "News":10,
               "Personal websites": 11,
               "Science and Research":12,
               "Shopping":13,
               "Social Networks and Internet":14,
               "Sports":15,
               "Travel and Tourism":16,
           }
           console.log(cat)
           document.querySelector(`select option:nth-child(${categoryObj[cat] + 1})`).selected = true;
         },cat)
    
       await page.waitForTimeout(500)
       await page.type('#addform > div:nth-child(4) > div > input', fillData.Title);
       await page.waitForTimeout(500)
       await page.type('div:nth-child(5) > div > textarea', fillData.Description);
       await page.waitForTimeout(500)
       await page.type('#emailgroup > div:nth-child(2) > input', fillData.Email);
       await page.waitForTimeout(500)
    
       autoScroll(page)
       await page.waitForTimeout(500)


       await page.evaluate(() => {
        document.querySelector("#agbgroup > div > div > label > input[type=checkbox]").parentElement.click();
      });
    

    //    const checkboxEl = await page.waitForSelector("#agbgroup > div > div > label > input[type=checkbox]");
    //    checkboxEl.click();
    
    
       const sumbit = await page.waitForSelector("#addform > div:nth-child(20) > div > button");
       sumbit.click();
       
        let updatecell = sheet.getCell(workingCellNum, 9)
        updatecell.value = "complete";
        await sheet.saveUpdatedCells(); // save all updates in one call



       resolve("Done");
       })()
    
    })
   await scraperPromise

}

Start().finally(async () =>{
    process.exit()
});
