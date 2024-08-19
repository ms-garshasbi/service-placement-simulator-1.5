# Edge-to-Cloud Service Placement Simulator
This project simulates a three-tier edge-to-cloud infrastructure and provides different solvers for the placement of AR/VR services in edge-to-cloud AR/VR systems. The simulator follows a server-client architecture, where the client-side entity sends infrastructure and service characteristics in JSON format to the server-side. On the server, the service placement is executed based on the configurations and algorithm determined by the client in parallel manner. Then, the results, such as total response time and system reliability, are sent back by the server to the client.

### Prerequisites
To run the simulator, you need to install certain dependencies. In this repository, there are two folders (i.e., clinet and server): one designed to run on the server-side and the other on the client-side. To execute the server-side simulator, install Node.js on the server machine (preferably Ubuntu), navigate to the project directory, and install the following dependencies.

```bash
npm init --yes
npm install express
npm install ip
npm install perf_hooks
npm install csv-writer
```
To run the client-side simulator, make sure you have Node.js installed on your client machine (preferably on Ubuntu). Then, navigate to the project directory and proceed to install the necessary dependencies.

```bash
npm init --yes
npm install axios
npm install fs
```

After installing the dependencies on both server-side and client-side, `./node_modules`, `package.json`, and `package-lock.json` will be added in the directory.

# service-placement-simulator-1.5
## Coming soon
