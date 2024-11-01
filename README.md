# Edge-to-Cloud Service Placement Simulator
This project simulates a three-tier edge-to-cloud infrastructure and provides different solvers for the placement of AR/VR services in edge-to-cloud AR/VR systems. The simulator follows a server-client architecture, where the client-side entity sends infrastructure and service characteristics in JSON format to the server-side. On the server, the service placement is executed based on the configurations and algorithm determined by the client in parallel manner. Then, the results, such as total response time and system reliability, are sent back by the server to the client.

### Prerequisites
To run the simulator, you need to install certain dependencies. In this repository, there are two folders (i.e., clinet and server): one designed to run on the server-side and the other on the client-side. To execute the server-side simulator, install Node.js on the server machine (preferably Ubuntu), navigate to the project directory, and install the following dependencies. The dependencies should also be installed for workers (in the worker folder).

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
```

### Usage
To use the simulator, first, its configurations must be set. In the client-side directory, you'll find a `configuration.json` file. In this file, you can determine which algorithm you want to use for service placement; the `cmd` property is used for this purpose, accepting values such as `PSBGA` for running the paralell GA. In addition, the scale of systems is determined via the `scale` property, which accepts values including `small`, `medium`, `large`, and `xlarge`. If you want to create a new scale, the infrastructure properties are set in the `useCase` property. The configuration file also allows you to configure the algorithms settings and set the IP and Port of the server.

After setting the configuration file, you can run the client-side simulator by executing the following command:

```bash
node platform-simulator.js
```

Make sure that the server-side simulator is run before the client-side simulator. The server-side simulator is executed using the following command:

```bash
node main-execution.js
```

After installing the dependencies on both server-side and client-side, `./node_modules`, `package.json`, and `package-lock.json` will be added in the directory.

To run the parallel genetic algorithm, first specify the number of workers in `package.json`. For example, to set ten workers, include the following script in your `package.json`, then execute `npm run workers` in the command line.

```bash
  "scripts": {
    "worker-01": "node worker.js",
    "worker-02": "node worker.js",
    "worker-03": "node worker.js",
    "worker-04": "node worker.js",
    "worker-05": "node worker.js",
    "worker-06": "node worker.js",
    "worker-07": "node worker.js",
    "worker-08": "node worker.js",
    "worker-09": "node worker.js",
    "worker-10": "node worker.js",
    "workers": "run-p worker-??"
  },
```

