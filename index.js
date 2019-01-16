const ch = require('cheerio');
const puppeteer = require('puppeteer');
const removeAccents = require('remove-accents');
const fs = require('fs');

const baseURL = 'https://www.tabele-kalorii.pl/produkty,all.html';
const loginURL = 'https://www.tabele-kalorii.pl/logowanie.php';
const userName = '';
const userPass = '';

const productCheck = async (page, urls) => {
  let productInfos = [];

  for(let i = 0; i<urls.length; i++) {
    await page.goto(`https://www.tabele-kalorii.pl/${urls[i]}`);
    const html = await page.content();
    const title = ch('.logowanie', html).text();

    const info = {};
    ch('.kalorie-tabela-gorna tr', html).each((i, el) => {
      info[removeAccents(ch('td', el).first().text().split(' ').join('').replace(/:/gi, ''))] =
      ch('td', el).last().text().replace(/\n/gi, '');
    })
    
    const macro = {};
    ch('.tabela-wo .tr-gorna-kreska',html).each((i, el) => {
      macro[removeAccents(ch('td.td-left', el).text().split(' ').join('').toLowerCase())] = 
        ch('td', el).eq(1).text().replace(/\n/gi, '');
    })

    productInfos.push({ title: title, info: info, macro: macro });
    await page.goBack();
  }

  return productInfos;
}

const productSearch = (page) => {
  page.goto(baseURL).then(async () => {
    let productsData = [];
    for(let i = 2; i<=30; i++) {
      try {
        const content = await page.content();
        let productUrls = [];

        ch('#tabela-tabele-kalorii td.tk-nazwa', content).each((i, el) => {
          productUrls.push(ch(el).children('a').attr('href'));
        });
        console.log(productUrls);

        const productinfo = await productCheck(page, productUrls);
        productsData.push(productinfo);

        console.log('ss page', i);
        // await page.screenshot({ path: `ss/page-${i}.png`, fullPage: true });

        const pagination = await page.$('#f_liczba_wierszy2d');
        await pagination.press('Delete');
        await pagination.press('Delete');
        await pagination.type(`${i}`);
        await pagination.press('Enter');
      } catch (er) {
        console.log(er)
      }
    }
    const dataOutput = JSON.stringify([].concat.apply([], productsData));

    await fs.writeFile('data.json', dataOutput, (err) => {
      err && console.log(err);
      console.log('saved');
    })
  });
}

const login = (page) => {
  page.goto(loginURL).then(async () => {
    try{
      const u = await page.$('#nazwa_uzytkownika');
      await u.type(userName);
      const p = await page.$('#haslo_uzytkownika');
      await p.type(userPass).then(() => p.press('Enter'));
      console.log('ss login');
      // await page.screenshot({ path: `login.png`, fullPage: true });
      
      return productSearch(page);
    } catch (er) {
      console.log(er)
    }
  });
}


(async () => {
  const browser = await puppeteer.launch({ slowMo: 30 });
  const page = await browser.newPage();
  
  login(page);
})();