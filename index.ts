// index.ts
import { ResourceGroup } from "./components/ResourceGroup";
import { SQLDatabase } from "./components/SQLDatabase";
import { SQLDbAdmin } from "./components/SQLDbAdmin";
import { StorageAccount } from "./components/StorageAccount";
import { WebApp } from "./components/WebApp";
import { PulumiAdmin } from "./components/PulumiAdmin";
import * as pulumi from "@pulumi/pulumi";

// Pulumi Config
const config = new pulumi.Config();
const location = config.require("location");
const sqlPassword = config.requireSecret("sqlPassword");
const sqlAdmin = config.require("sqladmin");
const owner = config.require("owner");

// Pulumi Standard and Stack Tag Creation
const admin = new PulumiAdmin("admin", { owner: owner });

// Create Resource Group
const rg = new ResourceGroup("app-resource-group", {
    location: location,
    tags: admin.standardTags,
});

// Create SQL Database
const sqlDb = new SQLDatabase("app-sql-db", {
    resourceGroupName: rg.resourceGroup.name,
    location: location,
    adminLogin: sqlAdmin,
    adminPassword: sqlPassword,
    tags: admin.standardTags,
});

// Create MSSQL Provider and User Management
const sqlAdminResource = new SQLDbAdmin("app-sql-db-admin", {
    sqlServerName: sqlDb.sqlServer.fullyQualifiedDomainName,
    sqlDatabaseName: sqlDb.sqlDatabase.name,
    sqlAdmin: sqlAdmin,
    sqlPassword: sqlPassword,
});

// Create Storage Account and Blob
const storage = new StorageAccount("app-storage", {
    resourceGroupName: rg.resourceGroup.name,
    location: location,
    tags: admin.standardTags,
});

// Construct Blob URL for deployment
const blobUrl = pulumi.interpolate`https://${storage.storageAccount.name}.blob.core.windows.net/${storage.blobContainer.name}/${storage.appBlob.name}`;

// Create Web App with Logging
const webApp = new WebApp("app-webapp", {
    resourceGroupName: rg.resourceGroup.name,
    location: location,
    sqlServerName: sqlDb.sqlServer.fullyQualifiedDomainName,
    sqlDatabaseName: sqlDb.sqlDatabase.name,
    sqlAdmin: sqlAdmin,
    sqlPassword: sqlPassword,
    appBlobUrl: blobUrl,
    tags: admin.standardTags,
});

// Outputs
export const webAppUrl = webApp.webApp.defaultHostName;
export const sqlServerName = sqlDb.sqlServer.fullyQualifiedDomainName;
export const sqlDatabaseName = sqlDb.sqlDatabase.name;
export const storageBlobUrl = blobUrl;