// components/PulumiAdmin.ts
import * as pulumi from "@pulumi/pulumi";
import * as pulumiservice from "@pulumi/pulumiservice";

export interface PulumiAdminArgs {
    owner: pulumi.Input<string>;
}

export class PulumiAdmin extends pulumi.ComponentResource {
    public readonly standardTags: { [key: string]: pulumi.Input<string> };

    constructor(name: string, args: PulumiAdminArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:admin:PulumiAdmin", name, {}, opts);

        // Standard Tags
        this.standardTags = {
            "Infrastructure Maintained by": "Pulumi",
            "Owner": args.owner,
        };

        // Creating Stack Tags using Pulumi Service
        const organization = pulumi.getOrganization();
        const project = pulumi.getProject();
        const stack = pulumi.getStack();

        new pulumiservice.StackTag("stack-owner", {
            name: "stack-owner",
            organization: organization,
            project: project,
            stack: stack,
            value: args.owner,
        }, { parent: this });
    }
}