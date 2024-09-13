// components/WebApp.ts
import * as azure from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

export interface WebAppArgs {
    resourceGroupName: pulumi.Input<string>;
    location: pulumi.Input<string>;
    sqlServerName: pulumi.Input<string>;
    sqlDatabaseName: pulumi.Input<string>;
    sqlAdmin: pulumi.Input<string>;
    sqlPassword: pulumi.Input<string>;
    appBlobUrl: pulumi.Input<string>;
    tags: { [key: string]: pulumi.Input<string> };
}

export class WebApp extends pulumi.ComponentResource {
    public readonly webApp: azure.web.WebApp;

    constructor(name: string, args: WebAppArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:azure:WebApp", name, {}, opts);

        // Web App Service Plan
        const appServicePlan = new azure.web.AppServicePlan(`${name}-asp`, {
            resourceGroupName: args.resourceGroupName,
            location: args.location,
            kind: "linux",
            reserved: true,
            sku: {
                name: "B1",
                tier: "Basic",
            },
            tags: args.tags,
        }, { parent: this });

        // Web App
        this.webApp = new azure.web.WebApp(`${name}-webapp`, {
            resourceGroupName: args.resourceGroupName,
            location: args.location,
            serverFarmId: appServicePlan.id,
            httpsOnly: true,
            kind: "app,linux",
            siteConfig: {
                alwaysOn: true,
                linuxFxVersion: "NODE|20-lts",
                appSettings: [
                    { name: "SQL_SERVER", value: args.sqlServerName },
                    { name: "SQL_USER", value: args.sqlAdmin },
                    { name: "SQL_PASSWORD", value: args.sqlPassword },
                    { name: "SQL_DATABASE", value: args.sqlDatabaseName },
                    { name: "WEBSITE_RUN_FROM_PACKAGE", value: args.appBlobUrl },
                ],
                detailedErrorLoggingEnabled: true,
                httpLoggingEnabled: true,
            },
            tags: args.tags,
        }, { parent: this });

        // Web App logging
        new azure.web.WebAppDiagnosticLogsConfiguration(`${name}-webAppLogs`, {
            resourceGroupName: args.resourceGroupName,
            name: this.webApp.name,
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
        }, { parent: this });
    }
}