// components/StorageAccount.ts
import * as azure from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

export interface StorageAccountArgs {
    resourceGroupName: pulumi.Input<string>;
    location: pulumi.Input<string>;
    tags: { [key: string]: pulumi.Input<string> };
}

export class StorageAccount extends pulumi.ComponentResource {
    public readonly storageAccount: azure.storage.StorageAccount;
    public readonly blobContainer: azure.storage.BlobContainer;
    public readonly appBlob: azure.storage.Blob;

    constructor(name: string, args: StorageAccountArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:azure:StorageAccount", name, {}, opts);

        this.storageAccount = new azure.storage.StorageAccount(`${name}`, {
            resourceGroupName: args.resourceGroupName,
            location: args.location,
            sku: {
                name: azure.storage.SkuName.Standard_LRS,
            },
            kind: azure.storage.Kind.StorageV2,
            tags: args.tags,
        }, { parent: this });

        this.blobContainer = new azure.storage.BlobContainer(`${name}-container`, {
            resourceGroupName: args.resourceGroupName,
            accountName: this.storageAccount.name,
            publicAccess: azure.storage.PublicAccess.None,
        }, { parent: this });

        this.appBlob = new azure.storage.Blob(`${name}-blob`, {
            resourceGroupName: args.resourceGroupName,
            accountName: this.storageAccount.name,
            containerName: this.blobContainer.name,
            blobName: "app.zip",
            source: new pulumi.asset.FileArchive("./app.zip"),
        }, { parent: this });
    }
}