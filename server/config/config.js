var fs = require('fs');

function getUserHome() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

var localConfigPath = getUserHome() + '/easygaadi-kafka-config.json';
var projectConfigPath = __dirname + '/config.json';

if(process.env.NODE_ENV === "test") {
    projectConfigPath = __dirname + '/test_config.json';
}

var selectedConfigPath;

if(fs.existsSync(localConfigPath)) {
    selectedConfigPath = localConfigPath;
} else if (fs.existsSync(projectConfigPath)) {
    selectedConfigPath = projectConfigPath;
} else {
    console.log('CONFIG FILE DOESNT EXIST');
    process.exit();
}

var finalJSONConfig = JSON.parse(fs.readFileSync(selectedConfigPath));

if(!finalJSONConfig.googleSecretKeyLimit) {
    console.log('googleSecretKeyLimit DOESNT EXIST');
    process.exit();
}

module.exports = finalJSONConfig;

