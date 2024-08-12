const { LanguageServiceClient } = require('@google-cloud/language');

// Google Cloud Natural Language API client
const client = new LanguageServiceClient({
    keyFilename: 'path/to/your/google-cloud-keyfile.json' // Path to your Google Cloud keyfile
});
exports.client = client;
