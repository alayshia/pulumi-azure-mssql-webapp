// components/ResourceGroup.ts
import * as azure from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

export interface ResourceGroupArgs {
    location: pulumi.Input<string>;
    tags: { [key: string]: pulumi.Input<string> };
}

export class ResourceGroup extends pulumi.ComponentResource {
    public readonly resourceGroup: azure.resources.ResourceGroup;

    constructor(name: string, args: ResourceGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:azure:ResourceGroup", name, {}, opts);

        this.resourceGroup = new azure.resources.ResourceGroup(name, {
            location: args.location,
            tags: args.tags,
        }, { parent: this });
    }
}