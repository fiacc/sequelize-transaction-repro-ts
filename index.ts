require("dotenv").config()

const {Sequelize} = require("sequelize-typescript")
const app = require("express")()
var pg = require("pg")
// pg.defaults.ssl =true
const cls = require("continuation-local-storage");
const namespace = cls.createNamespace('sequelize-transactions-namespace');


// Sequelize.useCLS(namespace); // doesn't work
// toggle these to test
(Sequelize as any).__proto__.useCLS(namespace) // does work

/*
Sequelize.useCLS(namespace);
Running 10s test @ http://localhost:3000/t-nok
10 connections

┌─────────┬──────┬──────┬───────┬──────┬──────┬───────┬──────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg  │ Stdev │ Max  │
├─────────┼──────┼──────┼───────┼──────┼──────┼───────┼──────┤
│ Latency │ 0 ms │ 0 ms │ 0 ms  │ 0 ms │ 0 ms │ 0 ms  │ 0 ms │
└─────────┴──────┴──────┴───────┴──────┴──────┴───────┴──────┘
┌───────────┬─────┬──────┬─────┬───────┬─────┬───────┬─────┐
│ Stat      │ 1%  │ 2.5% │ 50% │ 97.5% │ Avg │ Stdev │ Min │
├───────────┼─────┼──────┼─────┼───────┼─────┼───────┼─────┤
│ Req/Sec   │ 0   │ 0    │ 0   │ 0     │ 0   │ 0     │ 0   │
├───────────┼─────┼──────┼─────┼───────┼─────┼───────┼─────┤
│ Bytes/Sec │ 0 B │ 0 B  │ 0 B │ 0 B   │ 0 B │ 0 B   │ 0 B │
└───────────┴─────┴──────┴─────┴───────┴─────┴───────┴─────┘

Req/Bytes counts sampled once per second.

0 requests in 10.12s, 0 B read
10 errors (10 timeouts)


does not work because of
https://github.com/RobinBuschmann/sequelize-typescript/issues/58


With 
(Sequelize as any).__proto__.useCLS(namespace)

Running 10s test @ http://localhost:3000/t-nok
10 connections

┌─────────┬───────┬───────┬───────┬───────┬──────────┬─────────┬──────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max      │
├─────────┼───────┼───────┼───────┼───────┼──────────┼─────────┼──────────┤
│ Latency │ 12 ms │ 16 ms │ 30 ms │ 42 ms │ 17.07 ms │ 5.32 ms │ 65.58 ms │
└─────────┴───────┴───────┴───────┴───────┴──────────┴─────────┴──────────┘
┌───────────┬────────┬────────┬────────┬────────┬────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg    │ Stdev   │ Min    │
├───────────┼────────┼────────┼────────┼────────┼────────┼─────────┼────────┤
│ Req/Sec   │ 420    │ 420    │ 598    │ 647    │ 568.8  │ 69.48   │ 420    │
├───────────┼────────┼────────┼────────┼────────┼────────┼─────────┼────────┤
│ Bytes/Sec │ 143 kB │ 143 kB │ 204 kB │ 221 kB │ 194 kB │ 23.7 kB │ 143 kB │
└───────────┴────────┴────────┴────────┴────────┴────────┴─────────┴────────┘

Req/Bytes counts sampled once per second.

6k requests in 10.05s, 1.94 MB read

also cls support may be removed in https://github.com/sequelize/sequelize/pull/10817
*/



const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres"
})

const Model = Sequelize.Model

class User extends Model {}

User.init(
  {
    firstName: Sequelize.STRING,
    lastName: Sequelize.STRING
  },
  {
    sequelize,
    modelName: "user"
  }
)

async function run() {
  await sequelize.authenticate()

  await User.sync({ force: true })

  await User.create({
    firstName: "John",
    lastName: "Hancock"
  })

  app.get("/no-t", (req, res) => {
    User.findAll().then((users) => res.json(users))
  })

  app.get("/t-nok", (req, res) => {
    sequelize.transaction(async () => {

      await User.findAll().then((users) => res.json(users))
      
    })
  })

  app.get("/t-ok", (req, res) => {
    sequelize.transaction((t) => {
      return User.findAll({ transaction: t }).then((users) => res.json(users))
    })
  })

  app.listen(process.env.PORT || 3000, () => {
    console.log("server running")
  })
}

run()
