const { performance } = require('perf_hooks');

function getRandomValue(min, max) {
    return Math.random() * (max - min) + min;
}

class solutionOperation {
    constructor(sysConfig) {
        const config = sysConfig;
        this.services = config['services'];
        this.computingNodes = config['computingNodes'];
        this.componentConnections = config['componentConnections'];
        this.helpers = config['helperNodes'];
        this.users = config['usersNodes'];
        this.infraConnections = config['infraConnections'];
        this.ans = config;
    }

    randomSolution() {
        let solution = [];
        const numServices = this.services.length;
        const numVersions = (this.services[0]['components'][0]['versions']).length;
        const numComponents = (this.services[0]['components']).length;
        const numHelpers = this.helpers.length;
        const numUsers = this.users.length;

        for (let i = 1; i <= numServices; i++) {
            for (let j = 1; j <= numComponents; j++) {
                solution.push([i, j, Math.floor(getRandomValue(1, numVersions + 1)), Math.floor(getRandomValue(1, this.computingNodes.length + numHelpers + numUsers + 1))]);
            }
        }
        return solution;
    }

    validation(solution) //Checking that each component are running on a user or helper belongs to them
    {
        for (let i = 0; i < solution.length; i++) {
            let nodeID = solution[i][3];
            let serviceID = solution[i][0];
            let compatible = false;
            for (let j = 0; j < this.services.length; j++) {
                if (nodeID > this.computingNodes.length) {
                    if (this.services[j]['serviceID'] == serviceID && (this.services[j]['userID'] == nodeID || this.services[j]['helperID'] == nodeID)) {
                        compatible = true;
                        break;
                    }
                }
            }
            if (nodeID > this.computingNodes.length && compatible == false) {
                solution[i][3] = Math.floor(getRandomValue(1, this.computingNodes.length));
            }
        }
        return solution;
    }

    healing(solution) {
        let userFreeCapacity = JSON.parse(JSON.stringify(this.users));
        let computingNodesFreeCapacity = JSON.parse(JSON.stringify(this.computingNodes))
        let helperFreeCapacity = JSON.parse(JSON.stringify(this.helpers));

        const numHelpers = (this.helpers).length;
        const numComputingNodes = this.computingNodes.length;
        const userID = this.users[0]["nodeID"];
        const helperID = this.helpers[0]["nodeID"];

        for (let s = 0; s < solution.length; s++) {
            let placed = false;
            const cn = solution[s][3]

            if (cn >= userID) //So the node is a user node
            {
                const placedComponentMem = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                const placedComponentDisk = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                if (placedComponentMem < userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['memory'] &&
                    placedComponentDisk < userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['disk']) 
                {
                    userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['memory'] -= this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                    userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['disk'] -= this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                    placed = true;
                }
                if (placed == false) {
                    for (let cN = 0; cN < computingNodesFreeCapacity.length; cN++) {
                        if (computingNodesFreeCapacity[cN]['characteristics']['memory'] > placedComponentMem &&
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] > placedComponentDisk) 
                        {
                            solution[s][3] = computingNodesFreeCapacity[cN]['nodeID'];
                            computingNodesFreeCapacity[cN]['characteristics']['memory'] -= placedComponentMem;
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] -= placedComponentDisk;
                            placed = true;
                            break;
                        }
                    }
                }       
            }
            if (cn >= helperID && cn < userID) //So the node is a helper node
            {
                const placedComponentMem = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                const placedComponentDisk = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                if (placedComponentMem < helperFreeCapacity[(cn - 1) - (numComputingNodes)]['characteristics']['memory'] &&
                    placedComponentDisk < helperFreeCapacity[(cn - 1) - (numComputingNodes)]['characteristics']['disk']) 
                {
                    helperFreeCapacity[(cn - 1) - numComputingNodes]['characteristics']['memory'] -= placedComponentMem;
                    helperFreeCapacity[(cn - 1) - numComputingNodes]['characteristics']['disk'] -= placedComponentDisk;
                    placed = true;
                }
                if (placed == false) {
                    for (let cN = computingNodesFreeCapacity.length - 1; cN > 0; cN--) {
                        if (computingNodesFreeCapacity[cN]['characteristics']['memory'] > placedComponentMem &&
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] > placedComponentDisk) 
                        {
                            solution[s][3] = computingNodesFreeCapacity[cN]['nodeID'];
                            computingNodesFreeCapacity[cN]['characteristics']['memory'] -= placedComponentMem;
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] -= placedComponentDisk;
                            placed = true;
                            
                            break;
                        }
                    }
                }  
            }
            if (solution[s][3] < helperID) //So node is a computing node
            {
                const placedComponentMem = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                const placedComponentDisk = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                if (placedComponentMem < computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['memory'] &&
                    placedComponentDisk < computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['disk']) 
                {
                    computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['memory'] -= placedComponentMem;
                    computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['disk'] -= placedComponentDisk;
                    placed = true;
                   
                }
                if (placed == false) {
                    for (let cN = 0; cN < computingNodesFreeCapacity.length; cN++) {
                        if (computingNodesFreeCapacity[cN]['characteristics']['memory'] > placedComponentMem &&
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] > placedComponentDisk) 
                        {
                            solution[s][3] = computingNodesFreeCapacity[cN]['nodeID'];
                            computingNodesFreeCapacity[cN]['characteristics']['memory'] -= placedComponentMem;
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] -= placedComponentDisk;
                            placed = true;
                            break;
                        }
                    }
                }
            }

            if (placed == false)
            {
                console.log("Some of service components can not run due to lack of enough resource...");
            }
        }
        return solution;
    }

    initialSolutions(solutionSize) {
        let solutions = [];
        for (let i = 0; i < solutionSize; i++) {
            solutions.push(this.healing(this.validation(this.randomSolution())))
        }
        return solutions;
    }

    solutionsQualitySort(solutions, quality) 
    {
        let indices = solutions.map((_, index) => index);
        indices.sort((a, b) => quality[a] - quality[b]);
        let sortedSolutions = indices.map(index => solutions[index]);
        let sortedQuality = indices.map(index => quality[index]);
    
        return {
            bestSolution: sortedSolutions[0],
            bestQuality: sortedQuality[0],
            medianQuality: sortedQuality[Math.ceil(sortedQuality.length / 2)],
            worstQuality: sortedQuality[sortedQuality.length - 1]
        };
    }
    
    infraReliability(solution)
    {
        const numComponents = this.services[0]['components'].length;
        let totalRC = 0;
        for (let s = 0; s < this.users.length; s++)
        {
            //Calculate infrastructure reliability
            let reliabilityTier1 = 1;
            let reliabilityTier2 = 1;
            let reliabilityTier3 = 1;
            let reliabilityUsers = 0;
            let reliabilityHelpers = 0;
            let counterUser = 0, counterHelper = 0;

            for (let i = s*numComponents; i < (s+1)*numComponents; i++) 
            {   const node = solution[i][3];
                
                if (node < this.helpers[0]["nodeID"])
                {
                    if (this.computingNodes[node-1]['nodeTier'] == 1)
                    {
                        reliabilityTier1 *= (1 - this.computingNodes[node-1]['characteristics']['reliabilityScore'])
                    }
                    else if (this.computingNodes[node-1]['nodeTier'] == 2)
                    {
                        reliabilityTier2 *= (1 - this.computingNodes[node-1]['characteristics']['reliabilityScore'])
                    }
                    else if (this.computingNodes[node-1]['nodeTier'] == 3)
                    {
                        reliabilityTier3 *= (1 - this.computingNodes[node-1]['characteristics']['reliabilityScore'])
                    }
                }
                else if (node >= this.helpers[0]["nodeID"] && node < this.users[0]["nodeID"])
                {
                    counterHelper++;
                    reliabilityHelpers += this.helpers[node-this.helpers[0]["nodeID"]]['characteristics']['reliability']
                }
                else if (node >= this.users[0]["nodeID"])
                {
                    counterUser++;
                    reliabilityUsers += this.users[node-this.users[0]["nodeID"]]['characteristics']['reliability']
                }
            }

            reliabilityTier1 = 1 - reliabilityTier1;
            if (reliabilityTier1 == 0) {reliabilityTier1 = 1}

            reliabilityTier2 = 1 - reliabilityTier2;
            if (reliabilityTier2 == 0) {reliabilityTier2 = 1}

            reliabilityTier3 = 1 - reliabilityTier3;
            if (reliabilityTier3 == 0) {reliabilityTier3 = 1}

            if (reliabilityUsers == 0) {reliabilityUsers = 1; counterUser = 1;}
            reliabilityUsers = reliabilityUsers/counterUser;

            if (reliabilityHelpers == 0) {reliabilityHelpers = 1; counterHelper = 1;}
            reliabilityHelpers = reliabilityHelpers/counterHelper;

            totalRC += reliabilityTier1*reliabilityTier2*reliabilityTier3*reliabilityUsers*reliabilityHelpers;
        }
        return totalRC/this.users.length;
    }

    serviceReliability(solution)
    {
        const numComponents = this.services[0]['components'].length;
        let aveRS = 0;
        for (let s = 0; s < this.users.length; s++)
        {
            let RS = 1;
            for (let i = s*numComponents; i < (s+1)*numComponents; i++)
            {
                RS *= this.services[solution[i][0] - 1]['components'][solution[i][1] - 1]['versions'][solution[i][2] - 1]['characteristics']['reliabilityScore'];
            }
            aveRS = aveRS + RS
        }
        aveRS = aveRS/this.users.length;
        return aveRS;
    }

    executionTime(solution)
    {
        let eT = 0;
        for (let k = 0; k < solution.length; k++)
        {        
            let node_id = solution[k][3];
            if (node_id < this.helpers[0]["nodeID"])
            {
                const CR = this.services[solution[k][0] - 1]['components'][solution[k][1] - 1]['versions'][solution[k][2] - 1]['characteristics']['cpu'];
                const CC = this.computingNodes[solution[k][3] - 1]['characteristics']['cpu'];
                eT = eT + CR/CC;
            }
            else if (node_id >= this.helpers[0]["nodeID"] && node_id < this.users[0]["nodeID"])
            {
                const CR = this.services[solution[k][0] - 1]['components'][solution[k][1] - 1]['versions'][solution[k][2] - 1]['characteristics']['cpu'];
                const CC = this.helpers[solution[k][3] - this.helpers[0]["nodeID"]]['characteristics']['cpu'];
                eT = eT + CR/CC;
            }
            else if (node_id >= this.users[0]["nodeID"])
            {
                const CR = this.services[solution[k][0] - 1]['components'][solution[k][1] - 1]['versions'][solution[k][2] - 1]['characteristics']['cpu'];
                const CC = this.users[solution[k][3] - this.users[0]["nodeID"]]['characteristics']['cpu'];
                eT = eT + CR/CC;
            }
        }
        return eT;
    }

    bwDivision(solution)
    {
        //this function counts the number of connections is done by the links
        let conn = Array(this.infraConnections[0].length).fill(1).map(() => Array(this.infraConnections[0].length).fill(1));

        for (let s = 0; s < this.users.length; s++)
        {
            for (let i = s * this.componentConnections[0].length; i < (s + 1) * this.componentConnections[0].length; i++)
            {
                const sc_id = solution[i][1] - 1; //The SC that we want to check its dependencies.
                const cn_id = solution[i][3] - 1; //The node that SC running on it.
                for (let j = i; j < (s + 1) * this.componentConnections[0].length; j++)
                {
                    const scd_id = solution[j][1] - 1; //Dependent SC
                    if (this.componentConnections[sc_id][scd_id] != 0)
                    {
                        const cnd_id = solution[j][3] - 1; //The computin node that is running the dependent SC.
                        if (this.infraConnections[cn_id][cnd_id][0] != 0)
                        {
                            conn[cn_id][cnd_id] += 1; 
                        }     
                    }
                }
            }
        }
        //console.log(conn);
        return conn;
    }

    transmissionDelay(solution)
    {

        const conn = this.bwDivision(solution)
        

        let cT = 0;
        for (let s = 0; s < this.users.length; s++)
        {
            for (let i = s * this.componentConnections[0].length; i < (s + 1) * this.componentConnections[0].length; i++)
            {
                const ds = this.services[solution[i][0] - 1]['components'][solution[i][1] - 1]['versions'][solution[i][2] - 1]['characteristics']['dataSize'];
                const sc_id = solution[i][1] - 1; //The SC that we want to check its dependencies.
                const cn_id = solution[i][3] - 1; //The node that SC running on it.
                for (let j = i; j < (s + 1) * this.componentConnections[0].length; j++)
                {
                    const scd_id = solution[j][1] - 1; //Dependent SC
                    if (this.componentConnections[sc_id][scd_id] != 0)
                    {
                        const cnd_id = solution[j][3] - 1; //The computin node that is running the dependent SC.
                        if (this.infraConnections[cn_id][cnd_id][0] != 0)
                        {
                            const bw = this.infraConnections[cn_id][cnd_id][0]/conn[cn_id][cnd_id];
                            cT = cT + (ds/bw + this.infraConnections[cn_id][cnd_id][1]/20)
                        }     
                    }
                }
            }
        }
        return cT;
    }

    providerDelay(solution)
    {
        const numComponents = this.services[0]['components'].length;
        let totalPrDelay = 0;
        for(let s = 0; s < this.users.length; s++)
        {
            let pDelay = 0;
            for (let i = s*numComponents; i < (s+1)*numComponents;i++)
            {
                const pr = this.services[solution[i][0] - 1]['components'][solution[i][1] - 1]['versions'][solution[i][2] - 1]['characteristics']['provider'];
                switch (pr) {
                    case 'AWS':
                        pDelay += 0;
                        break;
                    case 'Azure':
                        pDelay += 0;
                        break;
                    case 'Ericsson':
                        pDelay += 0;
                        break;
                    case 'K8w':
                        pDelay += 0;
                        break;
                    default:
                        pDelay += 0;
                        break;
                }
            }
            totalPrDelay += pDelay;
        }
        return totalPrDelay;
    }

    codecDelay(solution)
    {
        const numComponents = this.services[0]['components'].length;
        let totalCodecDelay = 0;
        for(let s = 0; s < this.users.length; s++)
        {
            let cDelay = 0;
            for (let i = s*numComponents; i < (s+1)*numComponents;i++)
            {
                const codecType = this.services[solution[i][0] - 1]['components'][solution[i][1] - 1]['versions'][solution[i][2] - 1]['characteristics']['codecType'];
                switch (codecType) {
                    case 'H256':
                        cDelay = 0;
                        break;
                    case 'H264':
                        cDelay = 0;
                        break;
                    default:
                        cDelay = 0;
                        break;
                }
            }
            totalCodecDelay += cDelay;
        }
        return totalCodecDelay;
    }

    calculateAll(solution)
    {
        const ResponseTime = this.executionTime(solution) + 
                             this.transmissionDelay(solution) + 
                             this.providerDelay(solution) + 
                             this.codecDelay(solution);
        const PlatformReliability = this.infraReliability(solution);
        const ServiceReliability = this.serviceReliability(solution);

        return {
            ResponseTime,
            PlatformReliability,
            ServiceReliability
        }
    }

    loadCalculator(solution)
    {
        let users = 0;
        let helpers = 0;
        let tier1 = 0;
        let tier2 = 0;
        let tier3 = 0;

        for (let i = 0; i < solution.length; i++)
        {
            const nodeID = solution[i][3];
            if (nodeID < this.helpers[0]['nodeID'])
            {
                if (this.computingNodes[nodeID - 1]['nodeTier'] == 1)
                {
                    tier1++;
                }
                else if (this.computingNodes[nodeID - 1]['nodeTier'] == 2)
                {
                    tier2++;
                }
                else if (this.computingNodes[nodeID - 1]['nodeTier'] == 3)
                {
                    tier3++;
                }
            }
            else if (nodeID >= this.helpers[0]['nodeID'] && nodeID < this.users[0]['nodeID'])
            {
                helpers++
            }
            else if (nodeID >= this.users[0]['nodeID'])
            {
                users++;
            }
        }
        const sum = tier1 + tier2 + tier3 + helpers + users;
        const percentage = {tier1: tier1/sum,
            tier2: tier2/sum,
            tier3: tier3/sum, 
            helperTier: helpers/sum, 
            userTier: users/sum}
        return percentage;
    }

    solutionAnalyser(solution)
    {
        const cost = this.calculateAll(solution)
        const load = this.loadCalculator(solution);
        return {
            totalResponseTime: cost['ResponseTime'],
            platformReliability: cost['PlatformReliability'],
            serviceReliability: cost['ServiceReliability'],
            loadTier1: load['tier1'],
            loadTier2: load['tier2'],
            loadTier3: load['tier3'],
            loadTierHelper: load['helperTier'],
            loadTierUser: load['userTier']
        }
    }

    quality(solutions) 
    {
        const solutionQualities = [];
        const maxValue = this.initialMaxRT();
        let quality = [];
        for (let i = 0; i < solutions.length; i++) {
            solutionQualities.push(this.calculateAll(solutions[i]));
            solutionQualities[i]['ResponseTime'] = 0.2*solutionQualities[i]['ResponseTime'] / maxValue;
            solutionQualities[i]['PlatformReliability'] =  -0.2*solutionQualities[i]['PlatformReliability'];
            solutionQualities[i]['ServiceReliability'] =  -0.6*solutionQualities[i]['ServiceReliability'];
            quality.push(solutionQualities[i]['ResponseTime'] + solutionQualities[i]['PlatformReliability'] + solutionQualities[i]['ServiceReliability']);
        }
        return quality;
    }

    mapIntoInteger(solutions)
    {
        let solutionsINT = JSON.parse(JSON.stringify(solutions));
        let healedSolutions = [];
        const numVersions = (this.services[0]['components'][0]['versions']).length;
        const numNodes = this.computingNodes.length + this.users.length + this.helpers.length

        for (let i = 0; i < solutionsINT.length; i++)
        {
            for (let j = 0; j < solutionsINT[i].length; j++)
            {
                const r1 = JSON.parse(JSON.stringify(solutionsINT[i][j][2]))
                
                if (r1 < 1 || r1 > numVersions)
                {
                    solutionsINT[i][j][2] = 1//numVersions
                }
                else
                {
                    solutionsINT[i][j][2] = Math.floor(r1);
                }
                
                const r2 = JSON.parse(JSON.stringify(solutionsINT[i][j][3]))
                if (r2 < 1 || r2 > numNodes)
                {
                    solutionsINT[i][j][3] = numNodes
                }
                else
                {
                    solutionsINT[i][j][3] = Math.floor(r2);
                }
            }
            healedSolutions.push(this.healing(this.validation(solutionsINT[i])));
        }
        return healedSolutions;
    }

    initialMaxRT() 
    {
        const sys = JSON.parse(JSON.stringify(this.ans));
        const lP = new leastPowerful(sys);
        const soLP = lP.run();
        return soLP['servicePlacementResults']['totalResponseTime'];
    }
}

class leastPowerful extends solutionOperation { //Most computational version on least powerful node
    constructor(ans) {
        super(ans);
        this.services = ans['services'];
        this.computingNodes = ans['computingNodes'];
        this.helpers = ans['helperNodes'];
        this.users = ans['usersNodes'];
        this.componentConnections = ans['componentConnections'];
        this.infraConnections = ans['infraConnections'];
    }

    run() {
        let userFreeCapacity = JSON.parse(JSON.stringify(this.users));
        let computingNodesFreeCapacity = JSON.parse(JSON.stringify(this.computingNodes))
        let helperFreeCapacity = JSON.parse(JSON.stringify(this.helpers));
        let solution = [];
        const startTime = performance.now();

        //Sort computing nodes based on their cpu
        for (let i = 0; i < this.computingNodes.length - 1; i++) {
            for (let j = 0; j < this.computingNodes.length - 1; j++) {
                if (computingNodesFreeCapacity[j]['characteristics']['cpu'] > computingNodesFreeCapacity[j + 1]['characteristics']['cpu']) {
                    let tmp = computingNodesFreeCapacity[j];
                    computingNodesFreeCapacity[j] = computingNodesFreeCapacity[j + 1];
                    computingNodesFreeCapacity[j + 1] = tmp;
                }
            }
        }

        for (let u = 0; u < this.users.length; u++) {
            for (let c = 0; c < (this.services[0]['components']).length; c++) {
                //Sort versions based on cpu
                let min = this.services[u]['components'][c]['versions'][0]['characteristics']['cpu'];
                let inx = 0;
                for (let v = 0; v < (this.services[0]['components'][0]['versions']).length; v++) {
                    if (this.services[u]['components'][c]['versions'][v]['characteristics']['cpu'] > min) {
                        min = this.services[u]['components'][c]['versions'][v]['characteristics']['cpu'];
                        inx = v;
                    }
                }

                for (let n = 0; n < computingNodesFreeCapacity.length; n++) {
                    if (userFreeCapacity[u]['characteristics']['cpu'] > computingNodesFreeCapacity[n]['characteristics']['cpu'] &&
                        userFreeCapacity[u]['characteristics']['memory'] > this.services[u]['components'][c]['versions'][inx]['characteristics']['memory'] &&
                        userFreeCapacity[u]['characteristics']['disk'] > this.services[u]['components'][c]['versions'][inx]['characteristics']['disk']) {
                        solution.push([this.services[u]['serviceID'], this.services[u]['components'][c]['componentID'], this.services[u]['components'][c]['versions'][inx]['versionNumber'], userFreeCapacity[u]['nodeID']]);
                        userFreeCapacity[u]['characteristics']['memory'] -= this.services[u]['components'][c]['versions'][inx]['characteristics']['memory'];
                        userFreeCapacity[u]['characteristics']['disk'] -= this.services[u]['components'][c]['versions'][inx]['characteristics']['disk'];
                        break;
                    }
                    else if (computingNodesFreeCapacity[n]['characteristics']['memory'] > this.services[u]['components'][c]['versions'][inx]['characteristics']['memory'] &&
                        computingNodesFreeCapacity[n]['characteristics']['disk'] > this.services[u]['components'][c]['versions'][inx]['characteristics']['disk'] /*&&
                        computingNodesFreeCapacity[n]['characteristics']['networkBW'] > this.services[u]['components'][c]['versions'][inx]['characteristics']['dataSize']*/) {
                        solution.push([this.services[u]['serviceID'], this.services[u]['components'][c]['componentID'], this.services[u]['components'][c]['versions'][inx]['versionNumber'], computingNodesFreeCapacity[n]['nodeID']]);
                        computingNodesFreeCapacity[n]['characteristics']['memory'] -= this.services[u]['components'][c]['versions'][inx]['characteristics']['memory'];
                        computingNodesFreeCapacity[n]['characteristics']['disk'] -= this.services[u]['components'][c]['versions'][inx]['characteristics']['disk'];
                        //computingNodesFreeCapacity[n]['characteristics']['networkBW'] -=  this.services[u]['components'][c]['versions'][inx]['characteristics']['dataSize'];
                        break;
                    }
                    else
                    {
                        const hID = this.services[u]['helperID'];
                        let cuPlaced = false;
                        for (let h = 0; h < this.helpers.length; h++)
                        {
                            
                            if (hID == this.helpers[h]['nodeID'])
                            {
                                if (helperFreeCapacity[h]['characteristics']['memory'] > this.services[u]['components'][c]['versions'][inx]['characteristics']['memory'] &&
                                    helperFreeCapacity[h]['characteristics']['disk'] > this.services[u]['components'][c]['versions'][inx]['characteristics']['disk']) {
            
                                        solution.push([this.services[u]['serviceID'], this.services[u]['components'][c]['componentID'], this.services[u]['components'][c]['versions'][inx]['versionNumber'], helperFreeCapacity[h]['nodeID']]);
            
                                        helperFreeCapacity[h]['characteristics']['memory'] -= this.services[u]['components'][c]['versions'][inx]['characteristics']['memory'];
                                        helperFreeCapacity[h]['characteristics']['disk'] -= this.services[u]['components'][c]['versions'][inx]['characteristics']['disk'];
            
                                        cuPlaced = true;
                                        break;
                                }
                            }
                        }
                        if (cuPlaced == true)
                        {
                            break;
                        }
                    }
                }
            }
        }
        const endTime = performance.now();
        const exeTime = endTime - startTime;
        return {
            servicePlacementResults: this.solutionAnalyser(solution),
            runtime: exeTime
        };
    }

}

class geneticAlgorithm extends solutionOperation {
    constructor(sysAlgoConfig) {
        super(sysAlgoConfig);
        const config = sysAlgoConfig;
        this.ans = config.ans
        this.computingNodes = config.ans['computingNodes'];
        this.services = config.ans['services'];
        this.users = config.ans['usersNodes'];
        this.helpers = config.ans['helperNodes'];
        this.componentConnections = config.ans['componentConnections'];
        this.infraConnections = config.ans['infraConnections'];
        
        this.cProbability = config.ans['configsGA']['crossoverRate'];
        this.mProbability = config.ans['configsGA']['mutationRate'];
        this.numPopulation = config.ans['configsGA']['populationSize'];
        this.tournamentSize = config.ans['configsGA']['selectionSize'];
        this.iteration = config.ans['configsGA']['iteration'];
    }

    tournamentSelection(population, fitness) {
        let selectedPopulation = [];
        for (let n = 0; n < population.length; n++) {
            let rndIndividual = Math.floor(getRandomValue(0, population.length));
            let minCost = fitness[rndIndividual];
            for (let i = 1; i < this.tournamentSize; i++) { 
                let K = Math.floor(getRandomValue(0, population.length));
                if (fitness[K] < minCost) {
                    rndIndividual = K;
                    minCost = fitness[K];
                }
            }
            selectedPopulation.push(population[rndIndividual]);
        }
        return selectedPopulation;
    }
  
    crossover(population) {
        let crossoverPopulation = JSON.parse(JSON.stringify(population));
        for (let i = 0; i < population.length; i++) {
            if (Math.random() < this.cProbability) {
                let parentIndex1 = Math.floor(getRandomValue(0, population.length));
                let parentIndex2 = Math.floor(getRandomValue(0, population.length));
                let crossoverPoint = Math.floor(getRandomValue(0, population[0].length - 1));
                const offspring1 = [...population[parentIndex1].slice(0, crossoverPoint), ...population[parentIndex2].slice(crossoverPoint)];
                const offspring2 = [...population[parentIndex2].slice(0, crossoverPoint), ...population[parentIndex1].slice(crossoverPoint)];
                crossoverPopulation[parentIndex1] = offspring1;
                crossoverPopulation[parentIndex2] = offspring2;
            }
        }
        return crossoverPopulation;
    }

    mutation(population) {
        let mutationPopulation = JSON.parse(JSON.stringify(population));
        const numVersions = (this.services[0]['components'][0]['versions']).length;
        for (let m = 0; m < mutationPopulation.length; m++) {
            for (let i = 0; i < mutationPopulation[0].length; i++) {
                if (Math.random() < this.mProbability) {
                    mutationPopulation[m][i][2] = Math.floor(getRandomValue(1, numVersions));
                    mutationPopulation[m][i][3] = Math.floor(getRandomValue(1, this.computingNodes.length));
                }
            }
        }

        return mutationPopulation;
    }

    healingSolution(population) {
        let healingPopulation = JSON.parse(JSON.stringify(population));
        for (let i = 0; i < population.length; i++) {
            healingPopulation[i] = this.healing(this.validation(population[i]));
        }
        return healingPopulation;
    }

    elitism(population, newPopulation)
    {
        let sortedTotalPop = newPopulation.concat(population);
        let fit = this.quality(sortedTotalPop); 

        for (let i = 0; i < sortedTotalPop.length; i++)
        {
            for (let j = 0; j < sortedTotalPop.length; j++)
            {
                if (fit[j] > fit[j + 1])
                {
                    const tempF = JSON.parse(JSON.stringify(fit[j]))
                    fit[j] = JSON.parse(JSON.stringify(fit[j + 1]))
                    fit[j + 1] = JSON.parse(JSON.stringify(tempF))

                    const tempP = JSON.parse(JSON.stringify(sortedTotalPop[j]))
                    sortedTotalPop[j] = JSON.parse(JSON.stringify(sortedTotalPop[j + 1]))
                    sortedTotalPop[j + 1] = JSON.parse(JSON.stringify(tempP))
                }
            }
        }

        const nextG = [];
        for (let i = 0; i < population.length; i++)
        {
            nextG.push(sortedTotalPop[i]);
        }

        return nextG;
    }

    run(iniSols = this.initialSolutions(this.numPopulation), itr = this.iteration) 
    {
        let condition = 0;
        const startTime = performance.now();
        let population = iniSols;
        let fitness = this.quality(population);
        let fitnessInfoPrev = this.solutionsQualitySort(population,fitness);

        let fitnessInfoCurrent;
        for (let i = 0; i < itr; i++) {
            let fitness = this.quality(population);
            let selectedPopulation = this.tournamentSelection(population, fitness);
            let crossoverPopulation = this.crossover(selectedPopulation);
            let mutationPopulation = this.mutation(crossoverPopulation);
            population = this.healingSolution(mutationPopulation);
            //population = this.elitism(selectedPopulation, newPopulation);
            fitnessInfoCurrent = this.solutionsQualitySort(population,fitness);
            
           if (fitnessInfoCurrent['bestQuality'] < fitnessInfoPrev['bestQuality']) 
           {
                condition = 0;
                fitnessInfoPrev['bestQuality'] = fitnessInfoCurrent['bestQuality'];
                fitnessInfoPrev['bestSolution'] = fitnessInfoCurrent['bestSolution'];
            }
            else //This is when there is not improvment in fitness in the last iterations
            {
                // condition++;
                // if (condition > 50)
                // {
                //     console.log(i);
                //     break;
                // }
            }


        }
        const endTime = performance.now();
        const exeTime = endTime - startTime;

        return {
            servicePlacementResults: this.solutionAnalyser(fitnessInfoPrev['bestSolution']),
            runtime: exeTime,
            fitness: fitnessInfoPrev['bestQuality'],
            bestSolution: fitnessInfoPrev['bestSolution'],
            population: population
        }
    }
}

class semiBatchGA extends solutionOperation {
    constructor(sysAlgoConfig) {
        super(sysAlgoConfig);
        const config = sysAlgoConfig;
        this.ans = config.ans
        this.computingNodes = config.ans['computingNodes'];
        this.services = config.ans['services'];
        this.users = config.ans['usersNodes'];
        this.helpers = config.ans['helperNodes'];
        this.componentConnections = config.ans['componentConnections'];
        this.infraConnections = config.ans['infraConnections'];
        
        this.cProbability = config.ans['configsGA']['crossoverRate'];
        this.mProbability = config.ans['configsGA']['mutationRate'];
        this.numPopulation = config.ans['configsGA']['populationSize'];
        this.tournamentSize = config.ans['configsGA']['selectionSize'];
        this.iteration = config.ans['configsGA']['iteration'];

        this.GA = new geneticAlgorithm(sysAlgoConfig)
        this.a = 0.2, //A constant value. The more a, the more focus on reconf cost. ***This is applicable just for serial semi-batch GA.***If it is parallel, the value for a should be determined in the master.
        this.initialPlacementSize = 2, //All users divided by this.initialPlacementSize
        this.p = 0.01 //A small constant that multiplied by other parameters to calculate the reconfiguration downtime.
    }

    randomSolution_t0()
    {
        let solution = [];
        const numServices = Math.floor(this.services.length / this.initialPlacementSize);
        const numVersions = (this.services[0]['components'][0]['versions']).length;
        const numComponents = (this.services[0]['components']).length;
        const numHelpers = this.helpers.length;
        const numUsers = numServices;

        for (let i = 1; i <= numServices; i++) {
            for (let j = 1; j <= numComponents; j++) {
                solution.push([i, j, Math.floor(getRandomValue(1, numVersions + 1)), Math.floor(getRandomValue(1, this.computingNodes.length + numHelpers + numUsers + 1))]);
            }
        }
        return solution;
    }

    randomSolution_t1(sol)
    {
        let solution = JSON.parse(JSON.stringify(sol));
        const numComponents = this.services[0]['components'].length;
        const numServices = solution.length / numComponents;
        const numVersions = (this.services[0]['components'][0]['versions']).length;
        const numHelpers = this.helpers.length;
        const numUsers = numServices;

        for (let i = numServices + 1; i <= this.services.length; i++) {
            for (let j = 1; j <= numComponents; j++) {
                solution.push([i, j, Math.floor(getRandomValue(1, numVersions + 1)), Math.floor(getRandomValue(1, this.computingNodes.length + numHelpers + numUsers + 1))]);
            }
        }
        return solution;
    }

    validation_t0(solution)
    {
        const numComponents = this.services[0]['components'].length;
        const K = solution.length / numComponents
        for (let i = 0; i < solution.length; i++) 
        {
            let nodeID = solution[i][3];
            let serviceID = solution[i][0];
            let compatible = false;
            for (let j = 0; j < K; j++)
            {
                if (nodeID > this.computingNodes.length) 
                {
                    if (this.services[j]['serviceID'] == serviceID && (this.services[j]['userID'] == nodeID || this.services[j]['helperID'] == nodeID)) 
                    {
                        compatible = true;
                        break;
                    }
                }
            }
            if (nodeID > this.computingNodes.length && compatible == false) 
            {
                solution[i][3] = Math.floor(getRandomValue(1, this.computingNodes.length));
            }
        }
        return solution;
    }

    healing_t0(solution) 
    {
        let userFreeCapacity = JSON.parse(JSON.stringify(this.users));
        let computingNodesFreeCapacity = JSON.parse(JSON.stringify(this.computingNodes))
        let helperFreeCapacity = JSON.parse(JSON.stringify(this.helpers));

        const numHelpers = (this.helpers).length; 
        const numComputingNodes = this.computingNodes.length;
        const userID = this.users[0]["nodeID"];
        const helperID = this.helpers[0]["nodeID"];

        for (let s = 0; s < solution.length; s++) {
            let placed = false;
            const cn = solution[s][3]

            if (cn >= userID) //So the node is a user node
            {
                const placedComponentMem = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                const placedComponentDisk = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                if (placedComponentMem < userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['memory'] &&
                    placedComponentDisk < userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['disk']) 
                {
                    userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['memory'] -= this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                    userFreeCapacity[(cn - 1) - (numComputingNodes + numHelpers)]['characteristics']['disk'] -= this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                    placed = true;
                }
                if (placed == false) {
                    for (let cN = 0; cN < computingNodesFreeCapacity.length; cN++) {
                        if (computingNodesFreeCapacity[cN]['characteristics']['memory'] > placedComponentMem &&
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] > placedComponentDisk) 
                        {
                            solution[s][3] = computingNodesFreeCapacity[cN]['nodeID'];
                            computingNodesFreeCapacity[cN]['characteristics']['memory'] -= placedComponentMem;
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] -= placedComponentDisk;
                            placed = true;
                            break;
                        }
                    }
                }       
            }
            if (cn >= helperID && cn < userID) //So the node is a helper node
            {
                const placedComponentMem = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                const placedComponentDisk = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                if (placedComponentMem < helperFreeCapacity[(cn - 1) - (numComputingNodes)]['characteristics']['memory'] &&
                    placedComponentDisk < helperFreeCapacity[(cn - 1) - (numComputingNodes)]['characteristics']['disk']) 
                {
                    helperFreeCapacity[(cn - 1) - numComputingNodes]['characteristics']['memory'] -= placedComponentMem;
                    helperFreeCapacity[(cn - 1) - numComputingNodes]['characteristics']['disk'] -= placedComponentDisk;
                    placed = true;
                }
                if (placed == false) {
                    for (let cN = computingNodesFreeCapacity.length - 1; cN > 0; cN--) {
                        if (computingNodesFreeCapacity[cN]['characteristics']['memory'] > placedComponentMem &&
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] > placedComponentDisk) 
                        {
                            solution[s][3] = computingNodesFreeCapacity[cN]['nodeID'];
                            computingNodesFreeCapacity[cN]['characteristics']['memory'] -= placedComponentMem;
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] -= placedComponentDisk;
                            placed = true;
                            
                            break;
                        }
                    }
                }  
            }
            if (solution[s][3] < helperID) //So node is a computing node
            {
                const placedComponentMem = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['memory'];
                const placedComponentDisk = this.services[solution[s][0] - 1]['components'][solution[s][1] - 1]['versions'][solution[s][2] - 1]['characteristics']['disk'];
                if (placedComponentMem < computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['memory'] &&
                    placedComponentDisk < computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['disk']) 
                {
                    computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['memory'] -= placedComponentMem;
                    computingNodesFreeCapacity[(solution[s][3] - 1)]['characteristics']['disk'] -= placedComponentDisk;
                    placed = true;
                   
                }
                if (placed == false) {
                    for (let cN = 0; cN < computingNodesFreeCapacity.length; cN++) {
                        if (computingNodesFreeCapacity[cN]['characteristics']['memory'] > placedComponentMem &&
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] > placedComponentDisk) 
                        {
                            solution[s][3] = computingNodesFreeCapacity[cN]['nodeID'];
                            computingNodesFreeCapacity[cN]['characteristics']['memory'] -= placedComponentMem;
                            computingNodesFreeCapacity[cN]['characteristics']['disk'] -= placedComponentDisk;
                            placed = true;
                            break;
                        }
                    }
                }
            }

            if (placed == false)
            {
                console.log("Some of service components can not run due to lack of enough resource...");
            }
        }
        return solution;
    }

    initialSolutions_t0(solutionSize) 
    {
        let solutions = [];
        for (let i = 0; i < solutionSize; i++) {
            solutions.push(this.healing_t0(this.validation_t0(this.randomSolution_t0())))
        }
        return solutions;
    }

    initialSolutions_t1(solutionSize, solution) 
    {
        let solutions = [];
        for (let i = 0; i < solutionSize; i++) {
            solutions.push(this.healing_t0(this.validation_t0(this.randomSolution_t1(solution))))
        }
        return solutions;
    }

    reconfigurationCost(prev, compStatic, solutions) //Modelling 3 where we have a BINARY matrice
    {

        //Healing part
        const reconfCost = [];
        let reconfSize = 0;
        let downTime = 0;
        for (let x = 0; x < solutions.length; x++)
        {
            for (let i = 0; i < prev.length; i++)
            {
                if ((prev[i][2] != solutions[x][i][2] || prev[i][3] != solutions[x][i][3]) && compStatic[i] == 1)
                {
                    solutions[x][i][2] = prev[i][2]
                    solutions[x][i][3] = prev[i][3]
                }
                else if ((prev[i][2] != solutions[x][i][2] || prev[i][3] != solutions[x][i][3]) && compStatic[i] == 0)
                {
                    reconfSize++;

                    //
                    const containerSize = this.services[prev[i][0] - 1]['components'][prev[i][1] - 1]['versions'][prev[i][2] - 1]['characteristics']['containerSize'];
                    let nodeBW;
                    if (solutions[x][i][3] <= this.computingNodes[this.computingNodes.length - 1]['nodeID'])
                    {
                        nodeBW = this.computingNodes[solutions[x][i][3] - 1]['characteristics']['nodeBW'];
                    }
                    else if (solutions[x][i][3] > this.helpers[0]['nodeID'] && solutions[x][i][3] < this.helpers[this.helpers.length - 1]['nodeID'])
                    {
                        nodeBW = this.helpers[solutions[x][i][3] - 1]['characteristics']['nodeBW'];
                    }
                    else if (solutions[x][i][3] >= this.users[0]['nodeID'])
                    {
                        nodeBW = this.users[solutions[x][i][3] - 1]['characteristics']['nodeBW'];
                    }
                    
                    const c = 1.1 //A constant that is considered for calculations, installing new image and so on

                    downTime += containerSize/nodeBW * c
                }
            }
            reconfCost.push(downTime);
        }

        return reconfCost;
    }

    solutionAnalyser(prev, staticComponents, solution)
    {
        const cost = this.GA.calculateAll(solution)
        const load = this.GA.loadCalculator(solution);
        const confCost = this.reconfigurationCost(prev, staticComponents, [solution])
        return {
            totalResponseTime: cost['ResponseTime'],
            platformReliability: cost['PlatformReliability'],
            serviceReliability: cost['ServiceReliability'],
            reconfigurationCost: confCost[0],
            placementCost: this.GA.quality([solution])[0],
            loadTier1: load['tier1'],
            loadTier2: load['tier2'],
            loadTier3: load['tier3'],
            loadTierHelper: load['helperTier'],
            loadTierUser: load['userTier']
        }
    }

    quality_t1(prev, staticComponents, solutions)
    {
        const cost_pacement = this.quality(solutions)
        const cost_reconfiguration = this.reconfigurationCost(prev, staticComponents, solutions)

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
        
        const normalized_cost_pacement = normalizeArray(cost_pacement);
        
        const normalized_cost_reconfiguration = normalizeArray(cost_reconfiguration);

        //Calculating the cost
        const qul = [];


        for (let i = 0; i < normalized_cost_pacement.length; i++)
        {
            qul.push(normalized_cost_pacement[i] + normalized_cost_reconfiguration[i]);
        }

        return qul;
        
    }

    pQuality_t1(prev, staticComponents, solutions) // For parallel
    {
        const cost_pacement = this.quality(solutions)
        const cost_reconfiguration = this.reconfigurationCost(prev, staticComponents, solutions)

        return {
            placement: cost_pacement,
            reconfiguration: cost_reconfiguration
        }
    }

    initialPlacement()
    {
        const K = this.lP.run();
        const numServices = Math.floor(this.services.length / this.initialPlacementSize);
        const numComponents = numServices * (this.services[0]['components']).length

        K['solution'].splice(numComponents, numComponents + 6);
        return K['solution']

        //Initial optimal placment (T = 0)
        //const initialPlacement = this.GA.run(this.initialSolutions_t0(this.numPopulation), 0)
        //return initialPlacement['bestSolution'];
    }
}

module.exports = {
    solutionOperation,

    //Heuristics
    leastPowerful,

    //Metaheuristics
    geneticAlgorithm,
    semiBatchGA
}