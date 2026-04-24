import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDrinksDir = path.join(__dirname, '../public/drinks')

// Ensure directory exists
if (!fs.existsSync(publicDrinksDir)) {
  fs.mkdirSync(publicDrinksDir, { recursive: true })
}

const drinksMap = {
  caipirinha: 'Caipirinha',
  mojito: 'Mojito',
  margarita: 'Margarita',
  'pina-colada': 'Pina Colada',
  'moscow-mule': 'Moscow Mule',
  negroni: 'Negroni',
  'aperol-spritz': 'Aperol Spritz',
  cosmopolitan: 'Cosmopolitan',
  'gin-tonica': 'Gin And Tonic',
  'whisky-sour': 'Whiskey Sour',
  'sex-on-beach': 'Sex on the Beach',
  'blue-lagoon': 'Blue Margarita', // Blue Lagoon might not be found, fallback
  'long-island': 'Long Island Iced Tea',
  'cuba-libre': 'Cuba Libre',
  daiquiri: 'Daiquiri',
  'espresso-martini': 'Espresso Martini',
  sangria: 'Sangria',
  'mai-tai': 'Mai Tai',
  'tequila-sunrise': 'Tequila Sunrise',
  'old-fashioned': 'Old Fashioned',
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close(resolve)
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function fetchDrinkInfo(searchName) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchName)}`, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json)
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function run() {
  console.log('🍹 Iniciando download das imagens dos drinks...')
  
  for (const [id, searchName] of Object.entries(drinksMap)) {
    try {
      const data = await fetchDrinkInfo(searchName)
      if (data.drinks && data.drinks.length > 0) {
        const thumbUrl = data.drinks[0].strDrinkThumb + '/preview' // get smaller size (100x100) using /preview
        const dest = path.join(publicDrinksDir, `${id}.jpg`)
        
        console.log(`⏳ Baixando: ${id}...`)
        await downloadImage(thumbUrl, dest)
        console.log(`✅ Salvo: ${id}.jpg`)
      } else {
        console.log(`❌ Não encontrado: ${searchName} (ID: ${id})`)
      }
    } catch (e) {
      console.error(`❌ Erro ao buscar ${id}:`, e.message)
    }
  }
  
  console.log('🎉 Download concluído!')
}

run()
