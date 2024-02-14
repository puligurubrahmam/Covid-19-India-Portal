const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const path = require('path')
const jwt = require('jsonwebtoken')
let app = express()
app.use(express.json())
let db = null
let dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
const dbIntializerAndConnection = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started At http://localcost:3000/......')
    })
  } catch (e) {
    console.log(`Error Ocurred At ${e.message}`)
  }
}
dbIntializerAndConnection()

const authenticator = (request, response, next) => {
  let jwtToken
  const authHeaders = request.headers['authorization']
  if (authHeaders !== undefined) {
    jwtToken = authHeaders.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'puli', async (error, user) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const sqlquery = `
  SELECT * FROM user WHERE 
  username='${username}';
  `
  const user = await db.get(sqlquery)
  if (user === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    isPasswordMatched = await bcrypt.compare(password, user.password)
    if (isPasswordMatched === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'puli')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})
//Returns a list of all states in the state table
app.get('/states/', authenticator, async (request, response) => {
  const sqlquery = `
  SELECT state_id as stateId,
  state_name as stateName,
  population as population FROM state;
  `
  const states = await db.all(sqlquery)
  response.send(states)
})
//Returns a state based on the state ID
app.get('/states/:stateId/', authenticator, async (request, response) => {
  const {stateId} = request.params
  const sqlquery = `
  SELECT state_id as stateId,
  state_name as stateName,
  population FROM state
  WHERE state_id=${stateId};
  `
  const state = await db.all(sqlquery)
  response.send(state[0])
})
//Create a district in the district table, district_id is auto-incremented
app.post('/districts/', authenticator, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const sqlquery = `
  INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});
  `
  await db.run(sqlquery)
  response.send('District Successfully Added')
})
//Returns a district based on the district ID
app.get('/districts/:districtId/', authenticator, async (request, response) => {
  const {districtId} = request.params
  const sqlquery = `
  SELECT 
  district_id as districtId,
    district_name as districtName,
    state_id as stateId,
    cases as cases,
    cured as cured,
    active as active,
    deaths as deaths
   FROM district
  WHERE district_id=${districtId};
  `
  const district = await db.all(sqlquery)
  response.send(district[0])
})
//Deletes a district from the district table based on the district ID
app.delete(
  '/districts/:districtId/',
  authenticator,
  async (request, response) => {
    const {districtId} = request.params
    const sqlquery = `
  DELETE FROM district where district_id=${districtId};
  `
    await db.run(sqlquery)
    response.send('District Removed')
  },
)
//Updates the details of a specific district based on the district ID
app.put('/districts/:districtId/', authenticator, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const {districtId} = request.params
  const sqlquery = `
  UPDATE district
  SET
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  where district_id=${districtId};
  `
  await db.run(sqlquery)
  response.send('District Details Updated')
})
//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get('/states/:stateId/stats/', authenticator, async (request, response) => {
  const {stateId} = request.params
  const sqlquery = `
  SELECT sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths FROM district 
  where state_id=${stateId}
  group by state_id;
  `
  const state = await db.get(sqlquery)
  response.send(state)
})
module.exports = app
