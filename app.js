const express = require('express');
const {initializeApp} = require('firebase/app');
const { getFirestore } = require('firebase/firestore')
require("dotenv").config();

const { MongoClient } = require('mongodb')

const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;

const uri = `mongodb+srv://${user}:${password}@${host}`;

const mongoService = new MongoClient(uri);

const connectMongoDb = () => {
  mongoService
    .connect()
    .then(() => {
      console.log("mongodb is connected");
    })
    .catch((e) => {
      console.error(e);
    });
};

connectMongoDb();

const app = express();

// TODO: Uncomment out line 13
// Refer to Picture Example Folder for help for below instructions. (hit the gear for settings, click projecgt settings, then click service accounts)
// In your firebase project settings it will give you an option to "create service account".
// This generates a service account json file. Download it, and put the file in this project. 
// Enter the path to your service account json file below where it says "REPLACE_WITH_SERVICE_ACCOUNT"
// If you need more help with this step go here: https://firebase.google.com/docs/admin/setup

const serviceAccount = require("./cred.json");

// TODO: Uncomment out line 17-21
// Enter your database url from firebase where it says <DATABASE_NAME> below.
// Refer to picture for reference. It's the 2nd property.
const firebaseApp = initializeApp(serviceAccount);
const db = getFirestore(firebaseApp)

app.set('port', (process.env.PORT || 3001));

app.get('*', (req, res) => {
    res.send('Madden Companion Exporter');
});

// LEAGUE INFO
app.post('/:platform/:leagueId/leagueteams', (req, res) => {
    const {
        params: { leagueId }
    } = req;
    const bulk = mongoService.db(leagueId).collection('teams').initializeUnorderedBulkOp()

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        const { leagueTeamInfoList: teams } = JSON.parse(body);

        teams.forEach(team => {
            bulk.find({teamId: team.teamId}).upsert().replaceOne({...team})
        });

        await bulk.execute();

        res.sendStatus(200);
    });
});

// LEAGUE INFO
app.post('/:platform/:leagueId/standings', (req, res) => {
    const {
        params: { leagueId }
    } = req;

    const bulk = mongoService.db(leagueId).collection('standings').initializeUnorderedBulkOp()
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        const { teamStandingInfoList: teams } = JSON.parse(body);

        teams.forEach(team => {
            bulk.find({teamId: team.teamId}).upsert().replaceOne({...team})
            teamRef.set(team);
        });

        await bulk.execute();
        res.sendStatus(200);
    });
});

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// app.post(
//     '/:username/:platform/:leagueId/week/:weekType/:weekNumber/:dataType',
//     (req, res) => {
//         const db = admin.firestore();
//         const ref = db.ref();
//         const {
//             params: { username, leagueId, weekType, weekNumber, dataType },
//         } = req;
//         const basePath = `data/${username}/${leagueId}/`;
//         // "defense", "kicking", "passing", "punting", "receiving", "rushing"
//         const statsPath = `${basePath}stats`;
//         let body = '';
//         req.on('data', chunk => {
//             body += chunk.toString();
//         });
//         req.on('end', () => {
//             switch (dataType) {
//                 case 'schedules': {
//                     const weekRef = ref.child(
//                         `${basePath}schedules/${weekType}/${weekNumber}`
//                     );
//                     const { gameScheduleInfoList: schedules } = JSON.parse(body);
//                     weekRef.set(schedules);
//                     break;
//                 }
//                 case 'teamstats': {
//                     const { teamStatInfoList: teamStats } = JSON.parse(body);
//                     teamStats.forEach(stat => {
//                         const weekRef = ref.child(
//                             `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/team-stats`
//                         );
//                         weekRef.set(stat);
//                     });
//                     break;
//                 }
//                 case 'defense': {
//                     const { playerDefensiveStatInfoList: defensiveStats } = JSON.parse(body);
//                     defensiveStats.forEach(stat => {
//                         const weekRef = ref.child(
//                             `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/player-stats/${stat.rosterId}`
//                         );
//                         weekRef.set(stat);
//                     });
//                     break;
//                 }
//                 default: {
//                     const property = `player${capitalizeFirstLetter(
//                         dataType
//                     )}StatInfoList`;
//                     const stats = JSON.parse(body)[property];
//                     stats.forEach(stat => {
//                         const weekRef = ref.child(
//                             `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/player-stats/${stat.rosterId}`
//                         );
//                         weekRef.set(stat);
//                     });
//                     break;
//                 }
//             }

//             res.sendStatus(200);
//         });
//     }
// );

// ROSTERS
app.post('/:platform/:leagueId/freeagents/roster', (req, res) => {
    const {
        params: { username, leagueId, teamId }
    } = req;
    let body = '';

    const bulk = mongoService.db(leagueId).collection('players').initializeUnorderedBulkOp()

    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        const { rosterInfoList } = JSON.parse(body);

        console.log(JSON.parse(body))

        if(!rosterInfoList) {
            res.sendStatus('500')
            return
        }

        rosterInfoList.forEach(player => {
            bulk.find({rosterId: player.rosterId}).upsert().replaceOne({...player})
        });

        await bulk.execute();
        res.sendStatus(200);
    });    
});

// ROSTER
app.post('/:platform/:leagueId/team/:teamId/roster', async (req, res) => {
    const {
        params: { username, leagueId, teamId }
    } = req;
    let body = '';

    const bulk = mongoService.db(leagueId).collection('players').initializeUnorderedBulkOp()

    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        const { rosterInfoList } = JSON.parse(body);

        if(!rosterInfoList) {
            res.sendStatus('500')
            return
        }

        rosterInfoList.forEach(player => {
           bulk.find({rosterId: player.rosterId}).upsert().replaceOne({...player})
        });

       await bulk.execute();
       res.sendStatus(200);
    });
});

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);
