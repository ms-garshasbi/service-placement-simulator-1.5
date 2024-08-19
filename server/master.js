
const fs = require('fs');
const opt = require('./solvers');
const express = require('express');
const { performance } = require('perf_hooks');
const app = express();
app.use(express.json({ limit: '50mb' }));

const params = process.env.DATA_TO_SEND;
const configs = JSON.parse(params);

const setting = {
    computingNodes: readJSON(`./useCase/nodes.json`),
    helperNodes: readJSON(`./useCase/helpers.json`),
    usersNodes: readJSON(`./useCase/users.json`),
    services: readJSON(`./useCase/services.json`),
    componentConnections: readJSON(`./useCase/componentsConnections.json`),
    infraConnections:  readJSON(`./useCase/infraConnections.json`),
    staticComponents: '',
    initPlacement: '',

    configsGA: {
        crossoverRate: configs['cProbability'],
        mutationRate: configs['mProbability'],
        populationSize: configs['numPopulation'],
        selectionSize: configs['tournamentSize'],
        iteration: configs['iteration']
    }
}

const jobQueue = [];
const resultsQueue = [];
const activeJobs = new Map(); // Tracks jobs currently being processed
let jobCounter = 0;
let cycleCount = 0; // Track how many cycles of job generation have occurred
const nCycles = setting['configsGA']['iteration']; // The total number of generations
const nJobs = setting['configsGA']['populationSize'];
const jobSize = 2; // Number of chromosomes per job
let timeouts = []; // Array to store timeout

const gA = new opt.geneticAlgorithm({ans: setting})
const sBGA = new opt.semiBatchGA({ans: setting});

const sys = JSON.parse(JSON.stringify(setting));
const lP = new opt.mostPowerful(sys)
const K = lP.run();

//const tCA = new opt.mostReliablity(sys)
//const K = tCA.run();

const initPlacement = K['solution']
const staticComponents = sBGA.compStatic(initPlacement)

//const initPlacement = sBGA.initialPlacement();
let population = sBGA.initialSolutions_t1(setting['configsGA']['populationSize'], initPlacement);
let popFromWorkers = [];
let fitness = [];
let placementCost = [];
let reconfigurationCost = [];
let conv = [];


function readJSON(filePath)
{
  const result = fs.readFileSync(filePath, {
    encoding: 'utf-8',
  });
  return JSON.parse(result);
}

function normalizeArray(arr) {
    // Check for empty array
    if (arr.length === 0) {
      return [];
    }
  
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min;
  
    // Handle case where all elements are the same
    if (range === 0) {
      return arr.fill(1); // Fill all elements with 1 (or any other value within 0-1)
    }
  
    return arr.map(value => (value - min) / range);
}

function generateJobs(num, population) 
{   
    for (let i = 0; i < num; i += jobSize) 
    {
        const subPopulation = [];
        for (let j = i; j < i + jobSize; j++)
        {
            subPopulation.push(population[j])
        }
        jobQueue.push({id: ++jobCounter, solution: subPopulation});
        //jobQueue.push({id: ++jobCounter, solution1: population[i], solution2: population[i+1]});
    }
}

function requeueJob(jobId) {
    const job = activeJobs.get(jobId);
    if (job) {
        jobQueue.push(job);
        activeJobs.delete(jobId);
    }
}

app.get('/get-settings', (req, res) => {
    setting['staticComponents'] = staticComponents;
    setting['initPlacement'] = initPlacement;
    res.json(setting);
});

//Memory efficient
app.get('/get-job', (req, res) => {
    if (jobQueue.length > 0) {
        const job = jobQueue.shift(); // FIFO queue
        activeJobs.set(job.id, job);
        const timeout = setTimeout(() => {
            requeueJob(job.id);
            // Remove this timeout from the array after it's called
            const index = timeouts.indexOf(timeout);
            if (index !== -1) {
                timeouts.splice(index, 1);
            }
        }, 30000); // 5 seconds timeout
        timeouts.push(timeout); // Store the timeout
        res.json(job);
    } else {
        res.status(404).send('No jobs available');
    }
});

app.post('/post-result', (req, res) => {
    const result = req.body;
    resultsQueue.push(result);
    if (activeJobs.has(result.jobId)) {
        clearTimeout(activeJobs.get(result.jobId).timeoutHandle);
        activeJobs.delete(result.jobId);
    }
    //console.log('received result', result)
    for (let i = 0; i < result.solution.length; i++)
    {
        popFromWorkers.push(result.solution[i])
        //fitness.push(result.fitness[i])
        placementCost.push(result.fitness['placement'][i])
        reconfigurationCost.push(result.fitness['reconfiguration'][i])
    }

    if (resultsQueue.length >= nJobs/jobSize) 
    {
        resultsQueue.splice(0, nJobs/jobSize);
        cycleCount++;

        const normalized_cost_placement = normalizeArray(placementCost);
        const normalized_cost_reconfiguration = normalizeArray(reconfigurationCost);

        //Calculating the cost
        const qul = [];
        for (let i = 0; i < normalized_cost_placement.length; i++)
        {
            qul.push(normalized_cost_placement[i] + normalized_cost_reconfiguration[i]);
        }

        //Convergence/////////////////////////////////////////////////
        //let an = sBGA.solutionsQualitySort(population, qul);
        //let r = gA.quality([an['bestSolution']])
        //conv.push(r)
        /////////////////////////////////////////////////

        population = gA.tournamentSelection(popFromWorkers, qul) 
        popFromWorkers = [];
        //fitness = [];
        placementCost = [];
        reconfigurationCost = [];

        //console.log(`Completed cycle ${cycleCount}.`);
        
        if (cycleCount < nCycles) 
        {
            //console.log("new generation...")
            generateJobs(nJobs, population);
        }
        else 
        {
            //console.log('All cycles completed.');
            //console.log(x.solutionAnalyser(fitnessInfoPrev['bestSolution']))
            let fitnessInfoPrev = sBGA.solutionsQualitySort(population,qul);
            const jsonObject = { servicePlacementResults: sBGA.solutionAnalyser(initPlacement, staticComponents, fitnessInfoPrev['bestSolution']) };
            //console.log(jsonObject)
            const data = JSON.stringify(jsonObject, null, 2);
            try {
                fs.writeFileSync('data.json', data);
                console.log('JSON data is saved.');
            } catch (err) {
                console.error('An error occurred:', err);
            }


            //Convergence/////////////////////////////////////////////
            //const dataBest = conv.join('\n');
            //fs.writeFileSync('./convBest.txt', dataBest)
            /////////////////////////////////////////////


            cleanupAndExit();
        }
    }
    res.status(200).send('Result received');
});

generateJobs(nJobs, population);

const server = app.listen(8080, () => {
    console.log('Master listening on port 8080');
});


function cleanupAndExit() {
    timeouts.forEach(clearTimeout); // Clear all timeouts
    server.close(() => {
        console.log('Server closed after completing all cycles');
        process.exit(0); // Forcefully exits the process after cleanup
    });
}

