const axios = require('axios');
const alg = require('./solvers');

const sys_setting = {
    computingNodes: '',
    helperNodes: '',
    usersNodes: '',
    services: '',
    componentConnections: '',
    infraConnections: '',
    staticComponents: '',
    initPlacement: '',

    configsGA: {
        crossoverRate: '',
        mutationRate: '',
        populationSize: '',
        selectionSize: '',
        iteration: ''
    }
}

async function getJob() {
    try {
        const response = await axios.get('http://localhost:8080/get-job');
        return response.data;
    } catch (error) {
        //console.error('Failed to get job:', error.message);
        return null;
    }
}

async function sendJobResult(result) {
    try {
        await axios.post('http://localhost:8080/post-result', result);
        //console.log('Sent result:', result);
    } catch (error) {
        console.error('Failed to send job result:', error.message);
    }
}

async function processTask(job) {
    console.log(`Processing job: ${job.id}`);

    const ga = new alg.geneticAlgorithm({ans: sys_setting})
    const sBGA = new alg.semiBatchGA({ans: sys_setting})

    //crossover
    const crossPop = ga.crossover(job.solution)
    
    //Mutation
    const mutPop = ga.mutation(crossPop)

    //Healing
    job.solution = ga.healingSolution(mutPop)

    //Fitness calculation
    //const fit = sBGA.quality_t1(job.initialPlacement, job.solution)
    const fit = sBGA.pQuality_t1(sys_setting['initPlacement'], sys_setting['staticComponents'], job.solution)

    //console.log(sys_setting['staticComponents'])

    return { jobId: job.id, solution: job.solution, fitness: fit };
}

async function getSettings() {
    while (true) {  // Retry loop
        try {
            const response = await axios.get('http://localhost:8080/get-settings');
            sys_setting['computingNodes'] = response.data['computingNodes'];
            sys_setting['helperNodes'] = response.data['helperNodes'];
            sys_setting['usersNodes'] = response.data['usersNodes'];
            sys_setting['services'] = response.data['services'];
            sys_setting['componentConnections'] = response.data['componentConnections'];
            sys_setting['infraConnections'] = response.data['infraConnections'];
            sys_setting['staticComponents'] = response.data['staticComponents'];
            sys_setting['initPlacement'] = response.data['initPlacement'];
            sys_setting['configsGA']['crossoverRate'] = response.data['configsGA']['crossoverRate'];
            sys_setting['configsGA']['mutationRate'] = response.data['configsGA']['mutationRate'];
            sys_setting['configsGA']['populationSize'] = response.data['configsGA']['populationSize'];
            sys_setting['configsGA']['selectionSize'] = response.data['configsGA']['selectionSize'];
            sys_setting['configsGA']['iteration'] = response.data['configsGA']['iteration'];

            return true;
        } catch (error) {
            console.error('Failed to get settings:', error.message);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Retry every 5 seconds
        }
    }
}

async function startWorking() {
    let jobFailCounter = 0;  // Counter to track consecutive job retrieval failures

    const settingsLoaded = await getSettings();
    if (!settingsLoaded) {
        console.log('Failed to load settings, stopping worker...');
        return;
    }

    while (true) {
        const job = await getJob();
        if (job) {
            jobFailCounter = 0;  // Reset counter on successful job retrieval
            try {
                const result = await processTask(job);
                await sendJobResult(result);
            } catch (error) {
                console.error('Error processing job:', error);
            }
        } else {
            jobFailCounter++;  // Increment counter on failed job retrieval
            if (jobFailCounter >= 100) {
                console.log('Failed to get jobs 20 consecutive times, reloading settings...');
                await getSettings();  // Reload settings
                jobFailCounter = 0;  // Reset counter after reloading settings
            }
            // Wait before retrying to avoid rapid request rate which may not give time for issue resolution
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}

startWorking();