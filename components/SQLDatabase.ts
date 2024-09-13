// components/SQLDatabase.ts
import * as azure from "@pulumi/azure-native";
import * as mssql from "@pulumiverse/mssql";
import * as pulumi from "@pulumi/pulumi";

export interface SQLDatabaseArgs {
    resourceGroupName: pulumi.Input<string>;
    location: pulumi.Input<string>;
    adminLogin: pulumi.Input<string>;
    adminPassword: pulumi.Input<string>;
    tags: { [key: string]: pulumi.Input<string> };
}

export class SQLDatabase extends pulumi.ComponentResource {
    public readonly sqlServer: azure.sql.Server;
    public readonly sqlDatabase: azure.sql.Database;
    public readonly providerMssql: mssql.Provider;

    constructor(name: string, args: SQLDatabaseArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:azure:SQLDatabase", name, {}, opts);

        this.sqlServer = new azure.sql.Server(`${name}-sql-server`, {
            resourceGroupName: args.resourceGroupName,
            location: args.location,
            administratorLogin: args.adminLogin,
            administratorLoginPassword: args.adminPassword,
            version: "12.0",
            tags: args.tags,
        }, { parent: this });

        this.sqlDatabase = new azure.sql.Database(`${name}-sql-database`, {
            resourceGroupName: args.resourceGroupName,
            serverName: this.sqlServer.name,
            sku: {
                name: "S0",
            },
            tags: args.tags,
        }, { parent: this });

        // Provider for managing SQL users/roles
        this.providerMssql = new mssql.Provider(`${name}-providerMssql`, {
            hostname: this.sqlServer.fullyQualifiedDomainName,
            sqlAuth: {
                username: args.adminLogin,
                password: args.adminPassword,
            },
        }, { parent: this });
    }
}