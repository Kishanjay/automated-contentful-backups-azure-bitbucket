const path = require("path");
const contentfulExport = require("contentful-export");
const { BlobServiceClient } = require("@azure/storage-blob");

const BACKUP_CONTAINER_NAME = "contentful-backups"

const log = (msg) => {
  console.log(msg);
};

(async () => {
  try {
    log("starting..");

    const {
      CONTENTFUL_SPACE_ID,
      CONTENTFUL_ENVIRONMENT,
      CONTENTFUL_MANAGEMENT_TOKEN,
      AZURE_STORAGE_CONNECTION_STRING
    } = process.env;

    const contentfulExportOptions = {
      spaceId: CONTENTFUL_SPACE_ID,
      environmentId: CONTENTFUL_ENVIRONMENT,
      managementToken: CONTENTFUL_MANAGEMENT_TOKEN,
      exportDir: "./",
      contentFile: "contentful-export.json",
      saveFile: true
    };

    log("making contentful export..");
    try {
      await contentfulExport(contentfulExportOptions);
    } catch (err) {
      log("ERROR contentful export failed");
      console.log({ err });
      process.exit(1);
    }
    log("contentful export succeeded");

    log("connecting to storage account..");
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

    log("connecting to the container..");
    const containerClient = blobServiceClient.getContainerClient(BACKUP_CONTAINER_NAME);
    const createContainerResponse = await containerClient.createIfNotExists();
    log(`container connected [${createContainerResponse.requestId}]`);

    const dateStr = new Date().toISOString();
    const blobName = `export-${CONTENTFUL_SPACE_ID}-${CONTENTFUL_ENVIRONMENT}-${dateStr}.json`;
    log(`container blobname [${blobName}]`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const filePath = path.join(process.cwd(), "contentful-export.json");
    log(`uploading file.. [${filePath}]`);
    const uploadBlobResponse = await blockBlobClient.uploadFile(filePath);
    log(`file uploaded successfully [${uploadBlobResponse.requestId}]`);

    log("DONE");
  } catch (e) {
    log(`UNEXPECTED ERROR`);
    console.log({ e });
    process.exit(1);
  }
})();
