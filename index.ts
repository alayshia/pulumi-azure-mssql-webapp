import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as storage from "@pulumi/azure-native/storage";
import * as mssql from "@pulumiverse/mssql";
import * as pulumiservice from "@pulumi/pulumiservice";

// Pulumi Configs
const config = new pulumi.Config();
const sqlPassword = config.requireSecret("sqlPassword");
const sqladmin = config.require("sqladmin");
const owner = config.require("owner");

// Standard Tags
const standardTags = {
    "Infrastructure Maintained by": "Pulumi",
    "Owner": owner,
};

// Creating Stack Tags using Pulumi Service
const organization = pulumi.getOrganization();
const project = pulumi.getProject();
const stack = pulumi.getStack();

const stackTag = new pulumiservice.StackTag(owner,
    {
        name: "stack owner",
        organization: organization,
        project: project,
        stack: stack,
        value: owner,
    }
);

// Gets Azure client configuration for AD Administrator setup
const current = azure.authorization.getClientConfig();

// Create a Resource Group with tags
const resourceGroup = new azure.resources.ResourceGroup("resource-group", {
    location: "WestUS",
    tags: standardTags,
});

// Creates Azure SQL Server + SQL auth with tags
const sqlServer = new azure.sql.Server("sql-server", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    administratorLogin: sqladmin,
    administratorLoginPassword: sqlPassword,
    version: "12.0",
    tags: standardTags,
});

// Adds firewall rule: access from anywhere with tags
const firewallRule = new azure.sql.FirewallRule("firewallRule", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    startIpAddress: "0.0.0.0",
    endIpAddress: "255.255.255.255",
});

// Creates SQL Database with tags
const sqlDatabase = new azure.sql.Database("sql-database", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    sku: {
        name: "S0",
    },
    tags: standardTags,
});

// Provider leverages the admin permission to do tasks
const providerMssql = new mssql.Provider("providerMssql", {
    hostname: sqlServer.fullyQualifiedDomainName,
    sqlAuth: {
        username: sqladmin,
        password: sqlPassword,
    },
}, {
    dependsOn: [sqlDatabase, firewallRule],
});

// Fetch the Database ID (output)
const databaseId = mssql.getDatabaseOutput({
    name: sqlDatabase.name,
}, { provider: providerMssql });

// Create a Storage Account for storing the app package with tags
const storageAccount = new storage.StorageAccount("appstorage", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
    tags: standardTags,
});

// Create a Blob Container for the app package with tags
const appContainer = new storage.BlobContainer("app-container", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    publicAccess: storage.PublicAccess.None,
});

// Upload the ZIP file to the Blob Container with tags
const appBlob = new storage.Blob("appBlob", {
    blobName: "app.zip",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: appContainer.name,
    source: new pulumi.asset.FileArchive("./app.zip"),
});

// Creates a Sas Token which will be used for storage to application comms.
const sasToken = storage.listStorageAccountServiceSASOutput({
    accountName: storageAccount.name,
    protocols: storage.HttpProtocol.Https,
    sharedAccessStartTime: "2023-09-12", // Start date
    sharedAccessExpiryTime: "2025-01-01", // Expiration date
    resource: storage.SignedResource.B, 
    resourceGroupName: resourceGroup.name,
    permissions: storage.Permissions.R, 
    canonicalizedResource: pulumi.interpolate`/blob/${storageAccount.name}/${appContainer.name}/${appBlob.name}`,
});


// Leverage Outputs via interpolation to get the Blob Sas
const blobUrlWithSas = pulumi.interpolate`https://${storageAccount.name}.blob.core.windows.net/${appContainer.name}/${appBlob.name}?${sasToken.serviceSasToken}`;

// Web App Service Plan with tags. Linux machine
const appServicePlan = new azure.web.AppServicePlan("appServicePlan", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    kind: "linux",
    reserved: true,
    sku: {
        name: "B1",
        tier: "Basic",
    },
    tags: standardTags,
});

// Web App SQL connection environment variables. pkg deployment + logging and tags
const webApp = new azure.web.WebApp("webApp", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    kind: "app,linux",
    httpsOnly: true,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        alwaysOn: true,
        linuxFxVersion: "NODE|20-lts",
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
            {
                name: "WEBSITE_RUN_FROM_PACKAGE",
                value: blobUrlWithSas,
            }
        ],
        detailedErrorLoggingEnabled: true,
        httpLoggingEnabled: true,
    },
    tags: standardTags,
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

// Outputs for later use. SQL information + blob + webapp curl
export const resourceGroupName = resourceGroup.name;
export const webAppUrl = pulumi.interpolate`https://${webApp.defaultHostName}`;
export const sqlUser = sqlServer.administratorLogin;
export const sqlServerName = sqlServer.fullyQualifiedDomainName;
export const sqlDatabaseName = sqlDatabase.name;
export const blobUrl = blobUrlWithSas;