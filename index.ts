import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as storage from "@pulumi/azure-native/storage";
import * as mssql from "@pulumiverse/mssql";

// Gets Azure client configuration for AD Administrator setup
const current = azure.authorization.getClientConfig();

// Create a Resource Group
const resourceGroup = new azure.resources.ResourceGroup("resource-group", {
    location: "WestUS",
});

// Creates Azure SQL Server + SQL auth
const sqlServer = new azure.sql.Server("sql-server", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    administratorLogin: "sqladmin",
    administratorLoginPassword: new pulumi.Config().requireSecret("sqlPassword"),
    version: "12.0",
});

// Adds firewall rule: access from anywhere
const firewallRule = new azure.sql.FirewallRule("firewallRule", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    startIpAddress: "0.0.0.0",
    endIpAddress: "255.255.255.255",
});

// Creates SQL Database
const sqlDatabase = new azure.sql.Database("sql-database", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    sku: {
        name: "S0",
    },
});

// Provider leverages the admin permission to do tasks
const providerMssql = new mssql.Provider("providerMssql", {
    hostname: sqlServer.fullyQualifiedDomainName,
    sqlAuth: {
        username: "sqladmin",
        password: new pulumi.Config().requireSecret("sqlPassword"), 
    },
}, {
    dependsOn: [sqlDatabase, firewallRule],
});

// Fetch the Database ID (output)
const databaseId = mssql.getDatabaseOutput({
    name: sqlDatabase.name,
}, { provider: providerMssql });

// Create a Storage Account for storing the app package
const storageAccount = new storage.StorageAccount("appstorage", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

// Create a Blob Container for the app package
const appContainer = new storage.BlobContainer("app-container", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    publicAccess: storage.PublicAccess.None,
});

// Upload the ZIP file to the Blob Container
const appBlob = new storage.Blob("appBlob", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: appContainer.name,
    source: new pulumi.asset.FileAsset("app.zip"),  // Assumes app.zip exists
});

// ** Use the Blob URL directly ** 
const blobUrl = appBlob.url.apply(blobUrl =>
    pulumi.interpolate`https://${storageAccount.name}.blob.core.windows.net/${appContainer.name}/${appBlob.name}`
);

// Web App Service Plan
const appServicePlan = new azure.web.AppServicePlan("appServicePlan", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: "B1",
        tier: "Basic",
    },
});

// Web App with individual SQL connection environment variables + logging
const webApp = new azure.web.WebApp("webApp", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        appSettings: [
            {
                name: "SQL_SERVER",
                value: sqlServer.fullyQualifiedDomainName,
            },
            {
                name: "SQL_USER",
                value: "sqladmin",
            },
            {
                name: "SQL_PASSWORD",
                value: new pulumi.Config().requireSecret("sqlPassword"),
            },
            {
                name: "SQL_DATABASE",
                value: sqlDatabase.name,
            },
            // {
            //     name: "WEBSITE_RUN_FROM_PACKAGE",
            //     value: blobUrl,
            // }
        ],
        detailedErrorLoggingEnabled: true, 
        httpLoggingEnabled: true, 
    },
}, { dependsOn: appBlob });

// Web App logging
const diagnosticLogs = new azure.web.WebAppDiagnosticLogsConfiguration("webAppDiagnosticLogs", {
    resourceGroupName: resourceGroup.name,
    name: webApp.name,
    httpLogs: {
        fileSystem: {
            enabled: true,
            retentionInMb: 100, 
            retentionInDays: 1, 
        },
    },
    applicationLogs: {
        fileSystem: {
            level: "Verbose", 
        },
    },
    detailedErrorMessages: {
        enabled: true,
    },
    failedRequestsTracing: {
        enabled: true,
    },
});

// Outputs the web app URL
export const webAppUrl = pulumi.interpolate`https://${webApp.defaultHostName}`;
export const sqlUser = sqlServer.administratorLogin;
export const sqlServerName = sqlServer.fullyQualifiedDomainName;
export const sqlDatabaseName = sqlDatabase.name;