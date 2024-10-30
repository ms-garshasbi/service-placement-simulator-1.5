//npm init --yes
//npm install express
//npm install ip
//npm install axios
//npm install csv-writer
//npm install csv-parser
//npm install perf_hooks

const algorithms = require('./solvers');
const express = require('express');
const ip = require('ip');

const app = express()
const ipAddress = ip.address()
const ipPort = 3001

app.use(express.json({
    inflate: true,
    limit: '200000kb',
    reviver: null,
    strict: true,
    type: 'application/json',
    verify: undefined
}))

function heuristicAlgorithms(ans)
{
    const sys = JSON.parse(JSON.stringify(ans));
    const tCA = new algorithms.taskContinuationAffinity(sys);
    const lRC = new algorithms.leastRequiredCPU(sys);
    const mDS = new algorithms.mostDataSize(sys);
    const mR = new algorithms.mostReliablity(sys);
    const mP = new algorithms.mostPowerful(sys);
    const lP = new algorithms.leastPowerful(sys);

    const solTCA = tCA.run();
    const solLRC = lRC.run();
    const solMDS = mDS.run();
    const solMR = mR.run();
    const solMP = mP.run();
    const soLP= lP.run();

    return {
        taskContinuationAffinity: solTCA,
        leastRequiredCPU: solLRC,
        mostDataSize: solMDS,
        mostReliablity: solMR,
        mostPowerful: solMP,
        leastPowerful: soLP
    };
}

app.post('/json', (req, res) => {

    if (req.body['type'] == 'current' && req.body['algo'] == 'GA')
    {
        console.log('\ngeneticAlgorithm is running...');
        const gA = new algorithms.geneticAlgorithm({ans: req.body});
        const geneticAlgorithm = gA.run();
        //const geneticAlgorithm = gA.run().catch(error => console.error("Failed to run the master:", error));
        res.json({GA_result: geneticAlgorithm['servicePlacementResults'], GA_runtime: geneticAlgorithm['runtime']}) 
    }
    else if (req.body['type'] == 'current' && req.body['algo'] == 'PSBGA')
        {
            console.log('\nparalellGeneticAlgorithm is running...');
            const pGA = new algorithms.parallelGeneticAlgorithm();
            pGA.run(req).then(parallelGeneticAlgorithm => {
                    res.json({pSBGA_result: parallelGeneticAlgorithm['servicePlacementResults'], pSBGA_runtime: parallelGeneticAlgorithm['runtime']}) 
                }).catch(error => {
                    console.error('Error occurred:', error);
                });
    }
    else
    {
        console.log('Something went wrong...')
        //console.log(req.body);
    }
})

const server = app.listen(ipPort, () => {
    console.log(`Listening on ${ipAddress}:${ipPort} !!!`);
});
server.setTimeout(0);
