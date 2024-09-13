// components/SQLDbAdmin.ts
import * as mssql from "@pulumiverse/mssql";
import * as pulumi from "@pulumi/pulumi";

export interface SQLDbAdminArgs {
    sqlServerName: pulumi.Input<string>;
    sqlDatabaseName: pulumi.Input<string>;
    sqlAdmin: pulumi.Input<string>;
    sqlPassword: pulumi.Input<string>;
}

export class SQLDbAdmin extends pulumi.ComponentResource {
    public readonly providerMssql: mssql.Provider;
    public readonly databaseId: pulumi.Output<string>;

    constructor(name: string, args: SQLDbAdminArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:azure:SQLDbAdmin", name, {}, opts);

        // MSSQL Provider
        this.providerMssql = new mssql.Provider(`${name}-providerMssql`, {
            hostname: args.sqlServerName,
            sqlAuth: {
                username: args.sqlAdmin,
                password: args.sqlPassword,
            },
        }, { parent: this });

        // Fetch the Database ID and extract the id field. Using apply to extract the `id` field
        this.databaseId = mssql.getDatabaseOutput({
            name: args.sqlDatabaseName,
        }, { provider: this.providerMssql, parent: this }).apply(db => db.id); 

        // Create a dummy test SQL User
        new mssql.SqlLogin(`${name}-db-user`, {
            name: "test",
            password: args.sqlPassword,
        }, {
            provider: this.providerMssql,
            parent: this,
        });
    }
}