# Web App Deployment (Typscript) on Azure using Pulumi

A Pulumi Program that deploys a JS question and response web application (frontend & backend) to **Azure App Service** using **Pulumi**. The questions are stored in **Azure SQL Database**. 

## Table of Contents

- [Web App Deployment (Typscript) on Azure using Pulumi](#web-app-deployment-typscript-on-azure-using-pulumi)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Architecture](#architecture)
    - [Components](#components)
  - [Project Structure](#project-structure)
  - [Configuration](#configuration)
    - [1. Azure Configuration](#1-azure-configuration)
    - [2. Pulumi Configuration](#2-pulumi-configuration)
    - [3. App Package](#3-app-package)
  - [How to Deploy](#how-to-deploy)
    - [Local Development  (App Development Testing/Modification)](#local-development--app-development-testingmodification)
      - [1. Run the App Locally](#1-run-the-app-locally)
      - [2. Modify the App](#2-modify-the-app)
      - [3. Create a New ZIP for Deployment](#3-create-a-new-zip-for-deployment)
  - [SSH and Debugging](#ssh-and-debugging)
    - [SSH Access](#ssh-access)
    - [Logs and Debugging](#logs-and-debugging)
  - [Notes and Troubleshooting](#notes-and-troubleshooting)
  - [License](#license)

---

## Prerequisites

Ensure you have the following installed:

1. [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
2. [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. [Node.js](https://nodejs.org/) (LTS version)
4. [npm](https://www.npmjs.com/)
5. An Azure account ([Create one for free](https://azure.microsoft.com/en-us/free/)) with the proper permissions to create the resources.


## Architecture

- **Azure App Service (Linux)**: Hosts the Node.js web application.
- **Azure Blob Storage**: Stores the deployment package (`app.zip`).
- **Azure SQL Database**: Used for backend data storage.
- **Pulumi**: Infrastructure as Code (IaC) to deploy and manage resources on Azure.

### Components

- **Blob Storage**: Used to store the web app package (`app.zip`).
- **Web App**: Node.js app hosted on Azure App Service (Linux).
- **SQL Server**: For database backend of the app.
- **App Service Plan**: Configured to host the Node.js application on Linux.

## Project Structure

```
.
├── Pulumi.yaml                 # Pulumi project file
├── index.ts                    # Pulumi deployment script
├── app/                        # Node.js application (backend and frontend)
│   ├── package.json            # Node.js dependencies for the app
│   ├── server.js               # Entry point for the backend
│   └── public/                 # Frontend files (HTML, JS)
│       └── index.html
│       └── script.js
│   └── routes/                 # routes
│       └── api.js
├── app.zip                     # Zipped version of the app (for Azure deployment)
├── package.json                # Project dependencies for Pulumi
└── README.md                   # This file
```

- `Pulumi.yaml`: Pulumi project definition file.
- `index.ts`: Pulumi script that defines Azure resources (App Service, SQL, Storage, etc.).
- `app/`: The source code for your Node.js app.
  - `server.js`: The main entry point for your backend, powered by Express.
  - `public/`: Directory containing frontend static files (e.g., `index.html`).
- `app.zip`: Zipped version of your Node.js app used for Azure deployment.
- `package.json`: Node.js dependencies for the Pulumi deployment script (if needed).

## Configuration

### 1. Azure Configuration

Log into your Azure account using:

```bash
az login
```

(If Applicable) Set Azure subscription:

```bash
az account set --subscription "<YOUR_AZURE_SUBSCRIPTION_ID>"
```

### 2. Pulumi Configuration

Set up your Pulumi configurations:

```bash
pulumi config set sqladmin <your-sql-admin>
pulumi config set sqlPassword --secret <your-sql-password>
pulumi config set location <azure-location>
pulumi config set owner <your-username-or-email>
```

Replace `<your-sql-admin>`, `<your-sql-password>`, `<azure-location>`,  <your-username-or-email> with your values.

### 3. App Package

The `app.zip` file in the project root directory contains the zipped Node.js application with both frontend and backend.

Sample project structure inside `app.zip`:

```
app.zip
├── package.json
├── server.js
└── public/
    └── index.html
```

Azure App Service will use this ZIP file for deployment.

## How to Deploy

To deploy the project to Azure, follow these steps:

1. **Install Dependencies**:

   Install any required dependencies for Pulumi by running:

   ```bash
   npm install
   ```

2. **Run Pulumi**:

   Deploy the infrastructure using Pulumi:

   ```bash
   pulumi up
   ```

   This will provision the following on Azure:

   - Azure Storage Account and Blob Container.
   - Azure SQL Server and Database.
   - Azure App Service with Linux (Node.js runtime).
   - Deployment of `app.zip` from Blob Storage to Azure App Service.

3. **Access the Web App**:

   Once the deployment is complete, the web app URL will be displayed:

   ```bash
   pulumi stack output webAppUrl
   ```

   Visit the URL in your browser to see the deployed Node.js app.

### Local Development  (App Development Testing/Modification)

You can run and develop the Node.js app locally. If there is an issue with the application or you would like to make changes, you can follow these steps for local development:

#### 1. Run the App Locally

Navigate to the `app/` folder:

```bash
cd app
```

Install the Node.js dependencies:

```bash
npm install
```

Create a `.env` file in the `app/` folder with the following content to configure your local environment variables (replace the placeholders with your actual SQL server credentials):

_NOTE: This assumes that you have a sql server created that you can connect to._

```env
SQL_SERVER=<your-sql-server>
SQL_USER=<your-sql-admin>
SQL_PASSWORD=<your-sql-password>
SQL_DATABASE=<your-sql-database>
```

Start the app on `localhost:3000`:

```bash
npm start
```

This will run your Node.js application locally. The backend (Express.js) will be listening on `http://localhost:3000`, and you can interact with both the backend and frontend.

#### 2. Modify the App

- **Frontend (HTML, CSS, JS)**: You can modify the frontend by editing files in the `app/public/` directory.
- **Backend (Node.js)**: You can modify the backend logic by editing `server.js` in the `app/` directory.

#### 3. Create a New ZIP for Deployment

Once you’ve made changes to the app and tested it locally, you can create a new ZIP file for Azure deployment:

```bash
npm run zip
```

This will generate a new `app.zip` file in the project root directory, which you can then deploy to Azure by running `pulumi up` again.

## SSH and Debugging

### SSH Access

To access the Linux Web App via SSH for debugging:

1. Go to the Azure Portal.
2. Navigate to your **Web App**.
3. Select **Development Tools > SSH** to access the SSH terminal.

### Logs and Debugging

You can view logs for the web app in the Azure Portal under **Monitoring > App Service logs**. Alternatively, you can enable logs directly in your Pulumi script (as demonstrated in the deployment section).

## Notes and Troubleshooting

- **SQL Connection Issues**: For *local testing*, make sure your local `.env` file is properly configured with the correct SQL credentials.
- **ZIP Deployment**: Ensure that the `app.zip` file is correctly structured, with the `server.js` and `package.json` at the root level.
- **Azure App Service Logs**: Check the logs in the Azure Portal for more details if the deployment fails.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

